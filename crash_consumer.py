import json
import time
from confluent_kafka import Consumer, KafkaError
import clickhouse_connect

# 1. Initialize ClickHouse Client
ch_client = clickhouse_connect.get_client(host='localhost', port=8123, username='default', password='')

# 2. Configure Kafka Consumer
consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'healstack_crash_pipeline',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['healstack_crash_error', 'healstack_crash_rejection'])

print("[HealStack] Crash consumer listening for events...")

try:
    while True:
        msg = consumer.poll(1.0)
        
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            else:
                print(f"Consumer error: {msg.error()}")
                break
        
        # 3. Process the event payload
        event_data = json.loads(msg.value().decode('utf-8'))
        payload = event_data.get('payload', {})
        
        # 4. Extract telemetry mappings
        row = [
            event_data.get('project_id'),
            event_data.get('environment', 'production'),
            payload.get('name', 'UnknownError'),
            payload.get('message', ''),
            payload.get('stack', ''),
            event_data.get('received_at', int(time.time()))
        ]
        
        # 5. Insert directly into ClickHouse
        # Note: In production, batch these inserts (e.g., arrays of 500 rows) for optimal OLAP write performance
        ch_client.insert('healstack_crashes', [row], column_names=[
            'project_id', 'environment', 'error_name', 'error_message', 'stack_trace', 'timestamp'
        ])
        
except KeyboardInterrupt:
    print("\nShutting down consumer...")
finally:
    consumer.close()