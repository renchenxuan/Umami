# 团团图集合成与校验（Pillow）
# 用法：<venv-python> tools/pet-atlas/compose-atlas.py [rawPng] [outWebp] [contactSheet]
#
# 校验内容：
#   1. 尺寸恰为 1536×1872（8 列 × 9 行 × 192×208）
#   2. 每个已用格非空（alpha 覆盖率 > 2%），且身体不触格边（留边 ≥ 2px）
#   3. 每个未用格完全透明
# 通过后输出 WebP 图集与用于目检的 contact sheet（放大的行预览）。

import json
import sys
from PIL import Image

CW, CH = 192, 208
COLS, ROWS = 8, 9
ROW_FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6]
ROW_NAMES = ["idle", "runRight", "runLeft", "waving", "jumping", "failed", "waiting", "working", "review"]

raw_path = sys.argv[1] if len(sys.argv) > 1 else ".pet-run/atlas-raw.png"
out_path = sys.argv[2] if len(sys.argv) > 2 else ".pet-run/final/spritesheet.webp"
sheet_path = sys.argv[3] if len(sys.argv) > 3 else ".pet-run/qa/contact-sheet.png"

img = Image.open(raw_path).convert("RGBA")
problems = []
if img.size != (CW * COLS, CH * ROWS):
    problems.append(f"尺寸错误：{img.size}，期望 {(CW*COLS, CH*ROWS)}")

report = {"size": list(img.size), "cells": [], "ok": len(problems) == 0}
for row in range(ROWS):
    for col in range(COLS):
        cell = img.crop((col * CW, row * CH, (col + 1) * CW, (row + 1) * CH))
        alpha = cell.getchannel("A")
        bbox = alpha.getbbox()
        used = col < ROW_FRAMES[row]
        entry = {"row": row, "name": ROW_NAMES[row], "col": col, "used": used}
        if used:
            coverage = sum(1 for p in alpha.getdata() if p > 8) / (CW * CH)
            entry["coverage"] = round(coverage, 4)
            entry["bbox"] = list(bbox) if bbox else None
            if not bbox or coverage < 0.02:
                problems.append(f"空帧：row{row}({ROW_NAMES[row]}) col{col}")
            elif bbox and (bbox[0] < 2 or bbox[1] < 2 or bbox[2] > CW - 2 or bbox[3] > CH - 2):
                problems.append(f"触边：row{row}({ROW_NAMES[row]}) col{col} bbox={bbox}")
        else:
            if bbox is not None:
                problems.append(f"未用格非透明：row{row} col{col} bbox={bbox}")
        report["cells"].append(entry)

if problems:
    report["ok"] = False
    report["problems"] = problems
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(1)

# 输出最终 webp
import os
os.makedirs(os.path.dirname(out_path), exist_ok=True)
img.save(out_path, "WEBP", quality=90, method=6)
report["output"] = out_path

# contact sheet：每行一条（用该行帧拼出来），放大 1x，便于目检
os.makedirs(os.path.dirname(sheet_path), exist_ok=True)
max_frames = max(ROW_FRAMES)
sheet = Image.new("RGBA", (max_frames * CW, ROWS * CH), (40, 44, 42, 255))
for row in range(ROWS):
    for col in range(ROW_FRAMES[row]):
        cell = img.crop((col * CW, row * CH, (col + 1) * CW, (row + 1) * CH))
        sheet.paste(cell, (col * CW, row * CH), cell)
sheet.save(sheet_path, "PNG")

print(json.dumps(report, ensure_ascii=False)[:400])
print(f"OK -> {out_path}\ncontact sheet -> {sheet_path}")
