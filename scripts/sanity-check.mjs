import fs from "node:fs";
import path from "node:path";


const root = process.cwd();
const failures = [];
const warnings = [];

const requiredFiles = [
    "index.html",
    "styles.css",
    "app.js",
    "settings.py",
    "shared_settings.json",
    "README_DEPLOY.md",
    "vercel.json",
    "netlify.toml",
    "assets/background-day.png",
    "assets/base.png",
    "assets/gameover.png",
    "assets/message.png",
    "assets/pipe-green.png",
    "assets/quit-button.png",
    "assets/restart-button.png",
    "assets/start_button.png",
    "assets/bluebird-downflap.png",
    "assets/bluebird-midflap.png",
    "assets/bluebird-upflap.png",
    ...Array.from({ length: 10 }, (_, index) => `assets/${index}.png`),
];

const sharedKeys = [
    "WIDTH",
    "HEIGHT",
    "DEFAULT_SCALE",
    "MAX_WINDOW_RATIO",
    "FPS",
    "GRAVITY",
    "MIN_JUMP_FORCE",
    "MAX_JUMP_FORCE",
    "PIPE_GAP",
    "PIPE_SPEED",
    "PIPE_SPAWN_RATE",
    "GROUND_HEIGHT",
    "MIC_TRIGGER",
    "MIC_MAX_LEVEL",
    "JUMP_COOLDOWN",
    "START_DELAY_MS",
    "ROUND_GRACE_MS",
    "MIC_HISTORY_SIZE",
    "MIC_RESPONSE_BLEND",
    "MIC_BLOCKSIZE",
    "MIC_INPUT_GAIN",
    "MIC_NOISE_FLOOR_DECAY",
    "MIC_NOISE_FLOOR_RISE",
    "MIC_PEAK_DECAY",
    "MIC_ATTACK_TRIGGER",
    "MIC_REARM_RATIO",
    "TOP_OUT_LIMIT",
];


function addFailure(message) {
    failures.push(message);
}


function addWarning(message) {
    warnings.push(message);
}


function readFile(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}


function checkRequiredFiles() {
    for (const relativePath of requiredFiles) {
        if (!fs.existsSync(path.join(root, relativePath))) {
            addFailure(`Missing required file: ${relativePath}`);
        }
    }
}


function checkForConflictMarkers() {
    const filesToScan = [
        "index.html",
        "styles.css",
        "app.js",
        "settings.py",
        "shared_settings.json",
        "README_DEPLOY.md",
        "main.py",
        "audio_input.py",
        "ui.py",
    ];

    for (const relativePath of filesToScan) {
        if (!fs.existsSync(path.join(root, relativePath))) {
            continue;
        }

        const content = readFile(relativePath);
        if (
            content.includes("<<<<<<<")
            || content.includes("=======")
            || content.includes(">>>>>>>")
        ) {
            addFailure(`Merge conflict markers found in ${relativePath}`);
        }
    }
}


function checkJavaScriptSyntax() {
    try {
        // Parse only. This validates syntax without executing the browser app.
        // eslint-disable-next-line no-new-func
        new Function(readFile("app.js"));
    } catch (error) {
        addFailure(`JavaScript syntax check failed: ${error.message}`);
    }
}


function loadSharedSettings() {
    try {
        return JSON.parse(readFile("shared_settings.json"));
    } catch (error) {
        addFailure(`Unable to parse shared_settings.json: ${error.message}`);
        return null;
    }
}


function parseJsDefaultSettings(content) {
    const match = content.match(/const DEFAULT_SHARED_SETTINGS = \{([\s\S]*?)\n\};/);
    if (!match) {
        addFailure("Could not find DEFAULT_SHARED_SETTINGS in app.js");
        return {};
    }

    const body = match[1];
    const parsed = {};
    for (const line of body.split(/\r?\n/)) {
        const lineMatch = line.match(/^\s*([A-Z_]+):\s*([-0-9.]+),?\s*$/);
        if (!lineMatch) {
            continue;
        }
        parsed[lineMatch[1]] = Number(lineMatch[2]);
    }
    return parsed;
}


function parsePythonDefaultSettings(content) {
    const match = content.match(/_DEFAULT_SHARED_SETTINGS = \{([\s\S]*?)\n\}/);
    if (!match) {
        addFailure("Could not find _DEFAULT_SHARED_SETTINGS in settings.py");
        return {};
    }

    const body = match[1];
    const parsed = {};
    for (const line of body.split(/\r?\n/)) {
        const lineMatch = line.match(/^\s*"([A-Z_]+)":\s*([-0-9.]+),?\s*$/);
        if (!lineMatch) {
            continue;
        }
        parsed[lineMatch[1]] = Number(lineMatch[2]);
    }
    return parsed;
}


function checkSharedSettingsSync(sharedSettings) {
    if (!sharedSettings) {
        return;
    }

    for (const key of sharedKeys) {
        if (!(key in sharedSettings)) {
            addFailure(`shared_settings.json is missing key: ${key}`);
        }
    }

    const appDefaults = parseJsDefaultSettings(readFile("app.js"));
    const pythonDefaults = parsePythonDefaultSettings(readFile("settings.py"));

    for (const key of sharedKeys) {
        const sharedValue = Number(sharedSettings[key]);

        if (!(key in appDefaults)) {
            addFailure(`app.js DEFAULT_SHARED_SETTINGS is missing key: ${key}`);
            continue;
        }

        if (!(key in pythonDefaults)) {
            addFailure(`settings.py _DEFAULT_SHARED_SETTINGS is missing key: ${key}`);
            continue;
        }

        if (Number(appDefaults[key]) !== sharedValue) {
            addFailure(`app.js default for ${key} does not match shared_settings.json`);
        }

        if (Number(pythonDefaults[key]) !== sharedValue) {
            addFailure(`settings.py default for ${key} does not match shared_settings.json`);
        }
    }
}


function checkCanvasSync(sharedSettings) {
    if (!sharedSettings) {
        return;
    }

    const indexHtml = readFile("index.html");
    const canvasMatch = indexHtml.match(/<canvas[^>]*id="gameCanvas"[^>]*width="(\d+)"[^>]*height="(\d+)"/);

    if (!canvasMatch) {
        addFailure("Could not find gameCanvas width/height in index.html");
        return;
    }

    const width = Number(canvasMatch[1]);
    const height = Number(canvasMatch[2]);

    if (width !== Number(sharedSettings.WIDTH)) {
        addFailure("index.html canvas width does not match shared_settings.json WIDTH");
    }

    if (height !== Number(sharedSettings.HEIGHT)) {
        addFailure("index.html canvas height does not match shared_settings.json HEIGHT");
    }

    const styles = readFile("styles.css");
    if (!styles.includes("--game-width") || !styles.includes("--game-height")) {
        addFailure("styles.css is missing shared sizing variables");
    }

    if (!styles.includes("aspect-ratio: var(--game-width) / var(--game-height);")) {
        addFailure("styles.css is missing the shared aspect-ratio rule");
    }
}


function checkDeploymentDocs() {
    const readme = readFile("README_DEPLOY.md");
    if (!readme.includes("Netlify") || !readme.includes("Vercel")) {
        addFailure("README_DEPLOY.md is missing deployment provider guidance");
    }

    if (!readme.includes("sanity-check")) {
        addWarning("README_DEPLOY.md does not mention the sanity-check command yet");
    }
}


function checkHostConfig() {
    const netlifyToml = readFile("netlify.toml");
    if (!netlifyToml.includes("publish")) {
        addFailure("netlify.toml is missing a publish setting");
    }

    const vercelConfig = readFile("vercel.json");
    try {
        JSON.parse(vercelConfig);
    } catch (error) {
        addFailure(`vercel.json is invalid JSON: ${error.message}`);
    }
}


function main() {
    checkRequiredFiles();
    checkForConflictMarkers();
    checkJavaScriptSyntax();

    const sharedSettings = loadSharedSettings();
    checkSharedSettingsSync(sharedSettings);
    checkCanvasSync(sharedSettings);
    checkDeploymentDocs();
    checkHostConfig();

    if (failures.length > 0) {
        console.error("Sanity check failed.\n");
        for (const failure of failures) {
            console.error(`- ${failure}`);
        }

        if (warnings.length > 0) {
            console.error("\nWarnings:");
            for (const warning of warnings) {
                console.error(`- ${warning}`);
            }
        }

        process.exit(1);
    }

    console.log("Sanity check passed.");
    console.log("- Deployment-critical files exist");
    console.log("- JavaScript syntax is valid");
    console.log("- Shared settings are aligned across JSON, Python, and web defaults");
    console.log("- Canvas sizing matches shared settings");
    console.log("- Hosting config files are present");

    if (warnings.length > 0) {
        console.log("\nWarnings:");
        for (const warning of warnings) {
            console.log(`- ${warning}`);
        }
    }
}


main();
