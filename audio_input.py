import numpy as np
import sounddevice as sd

import settings


volume = 0.0
raw_volume = 0.0
noise_floor = 0.0
history = []
stream = None
last_error = ""
last_status = ""
selected_device_index = None
selected_device_name = ""
available_devices = []
trigger_level = 0.0
previous_level = 0.0
trigger_armed = True


def audio_callback(indata, frames, time_info, status):
    global volume, raw_volume, noise_floor, last_status
    global trigger_level, previous_level, trigger_armed

    if status:
        last_status = str(status)

    samples = np.asarray(indata, dtype=np.float32)
    if samples.size == 0:
        raw_volume = 0.0
        volume = 0.0
        return

    rms = float(np.sqrt(np.mean(samples ** 2)))
    raw_volume = rms

    if noise_floor == 0.0:
        noise_floor = rms

    if rms <= noise_floor:
        blend = settings.MIC_NOISE_FLOOR_RISE
    else:
        blend = settings.MIC_NOISE_FLOOR_DECAY

    noise_floor = (noise_floor * (1.0 - blend)) + (rms * blend)

    adjusted = max(0.0, rms - noise_floor)
    amplified = adjusted * settings.MIC_INPUT_GAIN

    history.append(amplified)
    if len(history) > settings.MIC_HISTORY_SIZE:
        history.pop(0)

    smoothed = sum(history) / len(history)
    volume = amplified if amplified > smoothed else (
        amplified * (1.0 - settings.MIC_RESPONSE_BLEND)
        + smoothed * settings.MIC_RESPONSE_BLEND
    )

    attack = max(0.0, volume - previous_level)
    if (
        trigger_armed
        and volume >= settings.MIC_TRIGGER
        and attack >= settings.MIC_ATTACK_TRIGGER
    ):
        trigger_level = volume
        trigger_armed = False
    elif volume <= settings.MIC_TRIGGER * settings.MIC_REARM_RATIO:
        trigger_armed = True

    previous_level = volume


def _normalize_name(name):
    return " ".join(str(name).strip().lower().split())


def _device_priority(device_info, index, default_index):
    score = 0
    normalized = _normalize_name(device_info.get("name", ""))

    if index == default_index:
        score += 100

    preferred_keywords = (
        "headset",
        "headphone mic",
        "headphones mic",
        "microphone",
        "mic",
        "usb",
        "bluetooth",
        "hands-free",
    )
    discouraged_keywords = (
        "stereo mix",
        "wave out",
        "line in",
        "virtual",
        "output",
    )

    for keyword in preferred_keywords:
        if keyword in normalized:
            score += 15

    for keyword in discouraged_keywords:
        if keyword in normalized:
            score -= 25

    max_channels = int(device_info.get("max_input_channels", 0) or 0)
    score += min(max_channels, 2)
    return score


def list_input_devices():
    devices = []

    try:
        default_input, _ = sd.default.device
    except Exception:
        default_input = None

    try:
        for index, device_info in enumerate(sd.query_devices()):
            if int(device_info.get("max_input_channels", 0) or 0) <= 0:
                continue

            device_copy = dict(device_info)
            device_copy["index"] = index
            device_copy["is_default"] = index == default_input
            device_copy["priority"] = _device_priority(device_copy, index, default_input)
            devices.append(device_copy)
    except Exception:
        return []

    devices.sort(key=lambda item: item["priority"], reverse=True)
    return devices


def _get_input_samplerate(device_index):
    try:
        device_info = sd.query_devices(device_index)
        samplerate = device_info.get("default_samplerate", 44100)
        if samplerate:
            return int(samplerate)
    except Exception:
        pass
    return 44100


def _close_stream():
    global stream

    if stream is None:
        return

    try:
        stream.stop()
        stream.close()
    except Exception:
        pass

    stream = None


def _open_input_device(device_info):
    global stream, last_error, selected_device_index, selected_device_name

    device_index = device_info["index"]
    device_name = str(device_info.get("name", f"Input {device_index}"))

    stream = sd.InputStream(
        callback=audio_callback,
        device=device_index,
        channels=1,
        samplerate=_get_input_samplerate(device_index),
        blocksize=settings.MIC_BLOCKSIZE,
        dtype="float32",
        latency="low",
    )
    stream.start()
    selected_device_index = device_index
    selected_device_name = device_name
    last_error = ""


def start_microphone(device_index=None):
    global last_error, last_status, history, volume, raw_volume, noise_floor, available_devices
    global selected_device_index, selected_device_name
    global trigger_level, previous_level, trigger_armed

    _close_stream()

    history = []
    volume = 0.0
    raw_volume = 0.0
    noise_floor = 0.0
    last_status = ""
    selected_device_index = None
    selected_device_name = ""
    trigger_level = 0.0
    previous_level = 0.0
    trigger_armed = True
    available_devices = list_input_devices()

    if not available_devices:
        last_error = "No input devices were found. Connect a microphone or headset mic."
        return False

    devices_to_try = available_devices
    if device_index is not None:
        devices_to_try = [
            device for device in available_devices if device["index"] == device_index
        ]
        if not devices_to_try:
            last_error = f"Input device {device_index} is not available."
            return False

    errors = []

    for device_info in devices_to_try:
        try:
            _open_input_device(device_info)
            return True
        except Exception as exc:
            errors.append(f"{device_info['name']}: {exc}")
            _close_stream()

    last_error = " | ".join(errors[:3])
    return False


def microphone_ready():
    return stream is not None


def get_error():
    return last_error


def get_status():
    return last_status


def get_selected_device_name():
    return selected_device_name


def get_selected_device_index():
    return selected_device_index


def get_available_device_names():
    if not available_devices:
        return []
    return [str(device.get("name", f"Input {device['index']}")) for device in available_devices]


def cycle_microphone(direction=1):
    global available_devices

    available_devices = list_input_devices()
    if not available_devices:
        return False

    if selected_device_index is None:
        target_device = available_devices[0]
        return start_microphone(device_index=target_device["index"])

    current_position = 0
    for index, device_info in enumerate(available_devices):
        if device_info["index"] == selected_device_index:
            current_position = index
            break

    next_position = (current_position + direction) % len(available_devices)
    return start_microphone(device_index=available_devices[next_position]["index"])


def consume_trigger_level():
    global trigger_level

    level = trigger_level
    trigger_level = 0.0
    return level
