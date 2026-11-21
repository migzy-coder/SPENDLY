from pathlib import Path

p = Path("index.html")
s = p.read_text(encoding="utf-8")
z = s.replace('data-composition-id="main"', 'data-composition-id="zones"')
overlay = """      <div id="zone-debug" style="position:absolute;inset:0;z-index:99;pointer-events:none">
        <div style="position:absolute;left:0;top:250px;width:1080px;height:1286px;border:6px solid rgba(18,128,95,.85)"></div>
        <div style="position:absolute;left:940px;top:960px;width:140px;height:960px;background:rgba(217,74,53,.28);border-left:5px solid #d94a35"></div>
        <p style="position:absolute;left:24px;top:258px;font:700 28px Arial;color:#12805f;background:#fff;padding:6px 12px;border-radius:10px">safe y 250-1536</p>
        <p style="position:absolute;left:630px;top:980px;font:700 26px Arial;color:#d94a35;background:#fff;padding:6px 12px;border-radius:10px">right 140 px</p>
      </div>
"""
needle = "    </div>\n\n    <script>"
assert needle in z
z = z.replace(needle, overlay + needle)
Path("zones.html").write_text(z, encoding="utf-8")
print("zones.html written")
