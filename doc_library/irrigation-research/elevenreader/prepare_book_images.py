"""Make compact EPUB/HTML image copies while retaining acquired source files.

Only encoding, white alpha compositing and proportional downsampling are used.
No crop, retouching, generated imagery or modification of the depicted object.
"""
from pathlib import Path
from PIL import Image,ImageOps
import hashlib,json

HERE=Path(__file__).resolve().parent
manifest_path=HERE/'Photo manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
OUT=HERE/'photos/ebook';OUT.mkdir(exist_ok=True)
for e in manifest['pictures']:
    source=HERE/'photos'/e['file']
    if hashlib.sha256(source.read_bytes()).hexdigest()!=e['sha256']:
        raise ValueError('Changed reference picture '+e['id'])
    with Image.open(source) as im:
        im=ImageOps.contain(im,(1600,1250))
        if e['kind']=='original rendering of published board coordinates':
            dest=OUT/(source.stem+'.png');im.save(dest,optimize=True)
            operation='Proportional fit within 1600 by 1250 pixels; PNG encoding; no cropping.'
        else:
            im=im.convert('RGBA')
            canvas=Image.new('RGBA',im.size,'white');canvas.alpha_composite(im)
            dest=OUT/(source.stem+'.jpg');canvas.convert('RGB').save(dest,quality=88,optimize=True)
            operation='Proportional fit within 1600 by 1250 pixels; alpha on white; JPEG quality 88; no cropping.'
        e['ebook_file']=str(dest.relative_to(HERE)).replace('\\','/')
        e['ebook_pixels']=list(im.size)
        e['ebook_sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
        e['ebook_preparation']=operation
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Prepared',len(manifest['pictures']),'compact picture copies;',sum((HERE/e['ebook_file']).stat().st_size for e in manifest['pictures']),'bytes in total.')
