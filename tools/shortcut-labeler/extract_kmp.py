#!/usr/bin/env python3
"""Extract a click-to-world-XZ map fixture from MKWii course.kmp."""
import json
import struct
import sys
from pathlib import Path


def parse_kmp_bytes(data: bytes) -> dict:
    if data[:4] != b"RKMD":
        raise ValueError("not an MKWii KMP file")
    section_count = struct.unpack_from(">H", data, 8)[0]
    header_size = struct.unpack_from(">H", data, 10)[0]
    sections = {}
    for i in range(section_count):
        offset = header_size + struct.unpack_from(">I", data, 0x10 + 4 * i)[0]
        if offset + 8 <= len(data):
            sections[data[offset:offset + 4]] = offset
    ckpt = sections.get(b"CKPT")
    if ckpt is None:
        raise ValueError("KMP has no CKPT section")
    count = struct.unpack_from(">H", data, ckpt + 4)[0]
    checkpoints = []
    for i in range(count):
        offset = ckpt + 8 + 0x14 * i
        left_x, left_z, right_x, right_z = struct.unpack_from(">ffff", data, offset)
        checkpoints.append({
            "left": {"x": left_x, "z": left_z},
            "right": {"x": right_x, "z": right_z},
        })
    points = [
        {"x": (p["left"]["x"] + p["right"]["x"]) / 2,
         "z": (p["left"]["z"] + p["right"]["z"]) / 2}
        for p in checkpoints
    ]
    return {"checkpoints": checkpoints, "points": points}


def main() -> None:
    source, dest = map(Path, sys.argv[1:3])
    result = parse_kmp_bytes(source.read_bytes())
    result["course"] = "DK Summit"
    result["source"] = "course.kmp CKPT world-XZ coordinates"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
