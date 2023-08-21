import asyncio
import json

import serial
import websockets

DEBUG = False
DEBUG_RPM = 60 * 9.44

if not DEBUG:
    ser = serial.Serial("/dev/cu.usbmodem1101", 9600)


async def socket_handler(websocket):
    while True:
        # Read line
        if not DEBUG:
            line = ser.readline()
        else:
            await asyncio.sleep(60 / DEBUG_RPM)
            line = b"."
        if line.strip() == b".":
            print("pedal")
            await websocket.send(json.dumps({"type": "pedal"}))


async def async_run_socket_server():
    async with websockets.serve(socket_handler, "", 8001):
        await asyncio.Future()

print("RUNNING")

asyncio.run(async_run_socket_server())
