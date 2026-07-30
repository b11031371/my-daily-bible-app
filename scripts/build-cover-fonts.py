"""把封面用的兩支字型裁切成只留實際會用到的字，輸出 woff2 進 repo。

為什麼要自己託管：這個環境冷啟動抓 Google 字型不穩，dev 又不會重試，
一失敗整個編譯就掛。裁切後檔案只有幾 KB，放進 repo 完全不必連網。

封面文案是固定的，所以字集算得出來——唯一的變數是使用者暱稱，那已經從
封底文案拿掉了（名字在第一頁就打過招呼，封底再叫一次本來也重複）。
"""

import io
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / 'src/app/fonts'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

# 各只取一個字重：封面只有標題和月份兩級，用不到第二個字重，而且多一個字重就
# 多一個檔案。字重明確宣告後瀏覽器不會去合成假粗體——襯線體合成粗體會糊。
FAMILIES = [
    # (Google family, weight, 輸出檔名)
    ('Noto+Serif+TC', '600', 'cover-cjk'),
    ('Cormorant+Garamond', '600', 'cover-latin'),
]


def cover_charset() -> str:
    """封面／封底會出現的字元。"""
    zh = io.open(REPO / 'src/lib/i18n/dictionaries/zh.ts', encoding='utf-8').read()
    en = io.open(REPO / 'src/lib/i18n/dictionaries/en.ts', encoding='utf-8').read()
    keys = ['coverTitle', 'backCoverLine', 'backCoverSignoff', 'backCoverRef']

    chars = set()
    for src in (zh, en):
        block = src[src.index('  recap: {'):]
        block = block[:block.index('\n  },')]
        for k in keys:
            m = re.search(k + r": '((?:[^'\\]|\\.)*)'", block)
            if m:
                # 抓到的是原始檔案文字，'\n' 是反斜線加 n 兩個字元、不是真的換行；
                # 直接丟進 set 會把「n」這個字母也當成「跳脫符號的一部分」一起收進來，
                # 之後再整組扣掉就會連 June、January 這些單字裡的 n 都被扣掉。
                # 所以要先還原成真正的換行字元，跳脫符號才不會冒充成內容字元。
                chars |= set(m.group(1).replace('\\n', '\n'))

    # 年月與經文出處改用內文字型（襯線體的數字高低不齊），所以封面字型不含數字。
    # 月份名稱仍要留：英文封面標題下方沒有月份，但未來若加回來會用到拉丁字母。
    for m in ('January February March April May June July August '
              'September October November December').split():
        chars |= set(m)
    # 常見標點與空白
    chars |= set(' ．，。！？：；、（）「」—－·')
    return ''.join(sorted(chars))


def download(family: str, weight: str) -> bytes:
    """從 Google Fonts 取 TTF。指定舊版 UA 拿 static TTF 而不是 woff2 分片。"""
    css_url = f'https://fonts.googleapis.com/css2?family={family}:wght@{weight}'
    req = urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/4.0'})
    css = urllib.request.urlopen(req, timeout=30).read().decode()
    urls = re.findall(r'url\((https://[^)]+)\)', css)
    if not urls:
        raise RuntimeError(f'{family}: CSS 裡找不到字型網址')
    req = urllib.request.Request(urls[0], headers=UA)
    return urllib.request.urlopen(req, timeout=60).read()


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    text = cover_charset()
    print(f'字集 {len(text)} 個字元')

    for family, weight, name in FAMILIES:
        raw = OUT / f'{name}.src'
        try:
            raw.write_bytes(download(family, weight))
        except Exception as e:
            print(f'✗ {family} 下載失敗：{e}')
            return 1

        dest = OUT / f'{name}.woff2'
        subprocess.run([
            sys.executable, '-m', 'fontTools.subset', str(raw),
            f'--text={text}',
            '--flavor=woff2',
            '--layout-features=kern,liga',
            '--no-hinting',
            '--desubroutinize',
            f'--output-file={dest}',
        ], check=True)
        raw.unlink()
        print(f'✓ {name}.woff2  {dest.stat().st_size / 1024:.1f} KB')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
