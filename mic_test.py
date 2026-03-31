import time

import numpy as np
import sounddevice as sd


print("Microphone Sound Level Monitor")
print("Available input devices:\n")

input_devices = []
default_input, _ = sd.default.device

for index, device in enumerate(sd.query_devices()):
    if device["max_input_channels"] <= 0:
        continue

    input_devices.append(index)
    marker = " (default)" if index == default_input else ""
    print(f"{index}: {device['name']}{marker}")

if not input_devices:
    raise SystemExit("No microphone/input devices found.")

choice = input("\nEnter device index to test (blank = default): ").strip()
selected_device = None if choice == "" else int(choice)

print("\nMake sounds and observe the volume values.")
print("Press CTRL + C to stop.\n")

volume_history = []


def audio_callback(indata, frames, time_info, status):
    global volume_history

    rms = np.sqrt(np.mean(indata ** 2))

    volume_history.append(rms)
    if len(volume_history) > 10:
        volume_history.pop(0)

    volume = sum(volume_history) / len(volume_history)
    bar = "#" * int(volume * 500)

    print(f"Volume: {volume:.5f} {bar}")


stream = sd.InputStream(
    callback=audio_callback,
    device=selected_device,
    channels=1,
    samplerate=44100,
)

with stream:
    while True:
        time.sleep(0.1)
