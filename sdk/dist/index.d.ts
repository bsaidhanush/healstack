interface HealStackConfig {
    apiKey?: string;
    apiUrl?: string;
    autoHeal?: boolean;
}
declare global {
    interface Window {
        healstackConfig?: HealStackConfig;
        init?: typeof init;
    }
    var healstackConfig: HealStackConfig | undefined;
}
declare function init(config?: HealStackConfig): void;
declare const _default: {
    init: typeof init;
};

export { type HealStackConfig, _default as default, init };
