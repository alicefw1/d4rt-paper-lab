import pathlib, sys

root = pathlib.Path('.')
bad = 0
for p in list(root.glob('lab/*.py')) + list(root.glob('web/**/*.js')) + list(root.glob('web/**/*.css')) + list(root.glob('web/**/*.html')):
    b = p.read_bytes()
    try:
        s = b.decode('utf-8-sig')
    except UnicodeDecodeError as e:
        print(f'{p}: NOT UTF-8 ({e})'); bad += 1; continue
    flags = []
    if '\ufffd' in s: flags.append(f'{s.count(chr(0xfffd))} replacement chars')
    if 'ï¿½' in s or 'Ã¤' in s: flags.append('mojibake')
    if b.startswith(b'\xef\xbb\xbf'): flags.append('BOM')
    print(f'{p}: {"OK" if not flags else "; ".join(flags)}')
    bad += len(flags)
print('CLEAN' if bad == 0 else f'{bad} issue(s)')
