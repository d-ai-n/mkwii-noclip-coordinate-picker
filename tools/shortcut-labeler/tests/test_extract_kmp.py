import struct
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1]))
from extract_kmp import parse_kmp_bytes


class KmpParserTest(unittest.TestCase):
    def test_ckpt_endpoints_become_world_xz_road_points(self):
        data = bytearray(0x90)
        data[:4] = b"RKMD"
        struct.pack_into(">H", data, 8, 15)
        struct.pack_into(">H", data, 10, 0x4c)
        struct.pack_into(">I", data, 0x10 + 5 * 4, 4)
        data[0x50:0x54] = b"CKPT"
        struct.pack_into(">H", data, 0x54, 2)
        struct.pack_into(">ffffBBBB", data, 0x58, 0.0, 10.0, 100.0, 10.0, 0, 0, 0, 0)
        struct.pack_into(">ffffBBBB", data, 0x6c, 0.0, 30.0, 100.0, 30.0, 0, 0, 0, 0)
        result = parse_kmp_bytes(bytes(data))
        self.assertEqual(result["checkpoints"][0]["left"], {"x": 0.0, "z": 10.0})
        self.assertEqual(result["checkpoints"][1]["right"], {"x": 100.0, "z": 30.0})
        self.assertEqual(result["points"], [{"x": 50.0, "z": 10.0}, {"x": 50.0, "z": 30.0}])
