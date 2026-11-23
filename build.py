import html, pathlib, re
src = pathlib.Path(__file__).parent / 'src'
dist = pathlib.Path(__file__).parent / 'dist'; dist.mkdir(exist_ok=True)
version = re.search(r"version: '([\d.]+)'", (src/'pecking-order.js').read_text()).group(1)
t = (src/'studio.html').read_text()
parts = {
  '/*@css*/': (src/'pecking-order.css').read_text() + '\n/* ===== Studio ===== */\n' + (src/'studio.css').read_text(),
  '/*@js*/': (src/'pecking-order.js').read_text() + '\n' + (src/'pecking-order-export.js').read_text() + '\n' + (src/'studio.js').read_text(),
  '/*@prompt*/': html.escape((src/'ai-prompt.txt').read_text().strip()),
  '/*@sample*/': (src/'sample.csv').read_text().strip(),
  '/*@version*/': version,
  '/*@aiexample*/': (pathlib.Path(__file__).parent/'samples'/'pecking-order-ai-example.json').read_text().strip(),
}
for k, v in parts.items():
    assert k in t, k
    if k in ('/*@js*/', '/*@sample*/', '/*@aiexample*/'): assert '</script' not in v.lower()
    t = t.replace(k, v)
(dist/'pecking-order-studio.html').write_text(t)
print('built', version, len(t)//1024, 'KB')

# ---- module package ----
import shutil, zipfile
mod = pathlib.Path(__file__).parent / 'mod_peckingorder'
shutil.copy(src/'pecking-order.css', mod/'media/css/pecking-order.css')
# Samples live in samples/; the module ships the same files.
for f in (pathlib.Path(__file__).parent/'samples').iterdir():
    if f.is_file(): shutil.copy(f, mod/'media/samples'/f.name)
# One script for the site: the renderer with the exporter appended (print needs it even without the Export button).
(mod/'media/js/pecking-order.js').write_text((src/'pecking-order.js').read_text() + '\n' + (src/'pecking-order-export.js').read_text())
# The site loads the minified copy; Joomla serves the readable one when System Debug is on.
import os, subprocess
terser = os.environ.get('TERSER') or shutil.which('terser')
cmd = [terser] if terser else ['npx', '--yes', 'terser@5']
for name in ('pecking-order', 'admin-tools'):
    subprocess.run(cmd + [str(mod/f'media/js/{name}.js'), '-c', '-m', '--comments', '/^!/', '-o', str(mod/f'media/js/{name}.min.js')], check=True)
print('minified', (mod/'media/js/pecking-order.min.js').stat().st_size // 1024, 'KB')
shutil.copy(dist/'pecking-order-studio.html', mod/'media/studio/pecking-order-studio.html')
# Every version has to agree before anything is zipped.
import json
here = pathlib.Path(__file__).parent
mv = re.search(r'<version>([\d.]+)</version>', (mod/'mod_peckingorder.xml').read_text()).group(1)
av = json.loads((mod/'media/joomla.asset.json').read_text())['version']
assert mv == av == version, ('versions differ', {'manifest': mv, 'asset json': av, 'js': version})
assert f'## {version}' in (mod/'CHANGELOG.md').read_text(), f'CHANGELOG.md has no "## {version}" entry'
man = (mod/'mod_peckingorder.xml').read_text()
assert '<updateservers>' in man and '<scriptfile>script.php</scriptfile>' in man and (mod/'script.php').is_file(), 'update server tag or install check missing'
# Same source, same bytes: fixed timestamps and order, so a rebuild keeps the SHA-256 the update XML was made from.
STAMP = (2026, 1, 1, 0, 0, 0)
def zipdir(zp, items):
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for f, name in sorted(items, key=lambda x: x[1]):
            i = zipfile.ZipInfo(name, STAMP); i.compress_type = zipfile.ZIP_DEFLATED; i.external_attr = 0o644 << 16
            z.writestr(i, f.read_bytes())
# The install zip is the module folder only: no demo, no build.py, no test kit.
zp = dist / f'mod_peckingorder-{version}.zip'
zipdir(zp, [(f, str(f.relative_to(mod))) for f in mod.rglob('*') if f.is_file()])
print('zipped', zp.name, zp.stat().st_size // 1024, 'KB')
# Source zip: everything needed to rebuild, plus the landing page, demo and test kit.
src_items = [(here/'build.py', 'build.py')]
for d in ('src', 'samples', 'testkit', 'landing', 'mod_peckingorder'):
    src_items += [(f, str(f.relative_to(here))) for f in (here/d).rglob('*') if f.is_file()]
sp = dist / f'pecking-order-source-{version}.zip'
zipdir(sp, src_items)
print('zipped', sp.name)

# Update XML through the shared CFD generator, when its folder is here (CFD_UPDATES, or ../cfd-updates next to this project).
import sys
gen = pathlib.Path(os.environ.get('CFD_UPDATES') or here.parent/'cfd-updates')
if (gen/'cfd_update.py').is_file():
    sys.path.insert(0, str(gen))
    import cfd_update
    try:
        cfd_update.release('mod_peckingorder', str(zp))
    except getattr(cfd_update, 'Fail', RuntimeError) as x:
        print('NOTE: update XML not written:', x)
else:
    print(f'NOTE: CFD update generator not found at {gen}; no update XML written. Run it on {zp.name} in the update-server chat:')
    print(f'      python3 cfd_update.py release mod_peckingorder {zp.name}')
print('Requirements: Joomla 5 or 6, PHP 8.2+')
