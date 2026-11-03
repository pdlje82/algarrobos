"""Fetch explicitly selected product pictures and retain provenance and originals.

No search or substitute image is used by this script. Every failed retrieval is
reported and prevents publication of an incomplete manifest. Pillow converts
formats to PNG for EPUB compatibility, without cropping or changing the subject.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import hashlib
import json
import tempfile
import requests
from PIL import Image, ImageOps, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
OUT=HERE/'photos'
ORIGINALS=OUT/'originals'
OUT.mkdir(exist_ok=True)
ORIGINALS.mkdir(exist_ok=True)
DATE='2026-11-03'
entries=[]

def add(ident,slug,title,owner,page,url,chapter,anchor,covers,kind='manufacturer product image',rights='Copyright retained by source owner; no open reuse licence established'):
    entries.append(dict(id=ident,slug=slug,title=title,owner=owner,source_page=page,image_url=url,
                        retrieved=DATE,chapter=chapter,after_starts=anchor,covers=covers,kind=kind,rights=rights))

add('p01','agronic','Progrés Agrónic 2500 irrigation controller','Progrés','https://www.progres.es/es/agronic2500','https://www.progres.es/sites/default/files/public/styles/product_360_view/public/02_2500_e_r1_c1.png?itok=ZFhR2VyQ',3,'One commercial route is a Spanish',['Agrónic','sector controller'])
add('p02','agrobee','Progrés AgroBee-L radio module','Progrés','https://www.progres.es/es/agrobee-l','https://www.progres.es/sites/default/files/public/styles/product_360_view/public/agrobee_2.png?itok=UjqZWn6z',3,'One commercial route is a Spanish',['AgroBee-L','solar radio module'])
add('p03','wise','Wise WiKit autonomous measuring station','Wise Agrotecnología','https://www.wiseagrotechnology.net/soluciones','https://le-de.cdn-website.com/773abcb2282244ab9bbecfe9518b0ad8/dms3rep/multi/opt/wikit_web-d1ad8d09-1920w.png',3,'Wise is a local sensing',['Wise','WiKit'])
add('p04','edagro','Edagro field monitoring example','Edagro','https://edagro.com/monitorizacion-de-riegos-2/','https://edagro.com/wp-content/uploads/2022/03/EmptyName-61-1024x682.jpg',3,'Wise is a local sensing',['Edagro','field station'])
add('p05','uc511','Milesight UC511 solar valve controller','Milesight','https://www.milesight.com/iot/product/iot-controller/uc51x','https://www.milesight.com/static/pc/en/iot/product/iot-controller/uc51x/1-uc511-small.png?t=1793352602272',3,'Milesight offers wireless valve controllers',['Milesight UC511','wireless actuator'])
add('p06','dragino','Dragino SE01-LB soil water, temperature and EC sensor','Dragino','https://dragino.com/products/agriculture-weather-station/item/277-se01-lb.html','https://dragino.com/media/k2/galleries/277/SE01-LB_10.jpg',3,'Dragino offers wireless probes',['Dragino SE01','VWC','EC','temperature'])
add('p07','opensprinkler','OpenSprinkler controller; historical AC model shown','OpenSprinkler','https://opensprinkler.com/product/opensprinkler/','https://opensprinkler.com/wp-content/uploads/2015/07/os30ac-1.jpg',3,'OpenSprinkler is an open-source controller',['OpenSprinkler','display','terminal blocks'])
add('p08','irrigatia','Irrigatia SOL-C120 solar tank kit','Irrigatia','https://www.irrigatia.com/irrigation-kits/sol-c120/','https://www.irrigatia.com/assets/uploads/images/product/c120/_imageSquareMedium/28913/c120.webp',3,'Irrigatia offers solar tank-fed',['Irrigatia','solar panel','pump kit'])
add('p09','blumat','Tropf-Blumat ceramic sensor, valve head, tube and tee','Blumat','https://blumat.co.uk/en/product/tropf-blumat','https://blumat.co.uk/storage/app/media/products/tropf/32003_Tropf_ERG_1.jpg',3,'Tropf-Blumat offers a different route',['Tropf-Blumat','ceramic cone','passive valve','microtube','tee'])
add('p10','plantcontrol','PlantCare PlantControl system','PlantCare','https://plant-care.ch/angebot/plantcontrol/','https://plant-care.ch/wp-content/uploads/2022/07/PLANTCONTROL-1024x583.png',3,'PlantCare documents monitoring',['PlantCare PlantControl CX','monitoring controller'])
add('p11','openirr','Open Irr assembled node with enclosure, battery cradle and probes','Andrew M. Bierer / HardwareX 2023, Figure 2','https://pmc.ncbi.nlm.nih.gov/articles/PMC10430591/','https://ars.els-cdn.com/content/image/1-s2.0-S2468067223000652-gr2.jpg',3,'There are also open research designs',['Open_Irr','enclosure','battery cradle','glands','radio antenna','Watermark'],kind='published research photograph',rights='CC BY 4.0, Andrew M. Bierer, 2023; unmodified figure, converted to PNG')
add('p12','openirr-components','Open Irr components: controller, clock, memory, sensor terminals and power','Andrew M. Bierer / HardwareX 2023, Figure 1','https://pmc.ncbi.nlm.nih.gov/articles/PMC10430591/','https://ars.els-cdn.com/content/image/1-s2.0-S2468067223000652-gr1.jpg',5,'Candidate components include low-power',['microcontroller','LoRa radio','RTC','MicroSD','multiplexer','connectors','battery cradle','power switch'],kind='published research component photograph',rights='CC BY 4.0, Andrew M. Bierer, 2023; unmodified figure, converted to PNG')
add('p14','tank','SCHÜTZ ECOBULK MX 1000 IBC; new container example','SCHÜTZ','https://www.schuetz-packaging.net/schuetz-usa/en/ibcs/ecobulk/ecobulk-mx/','https://www.schuetz-packaging.net/products/ibc/ecobulk-mx/1-000-liter/ibc-ecobulk-mx-1000.png?cid=6od.208v&resize=e71ef0%3A320x',4,'Each tank area would have',['IBC tank','base','refill cap','outlet'])
add('p15','pump','Irrigatia replaceable Tank Series internal pump; kit-specific example','Irrigatia','https://shop.irrigatia.com/spares-tank-series-c60-c120-c180/tank-series-internal-pump','https://shop.irrigatia.com/image/cache/catalog/spares/IRR-TS-PUMP-side-white-800-800x800.jpg',4,'Each tank area would have',['pump','replaceable pump'])
add('p16','filter','Rain Bird RBY pressure-regulating filter and serviceable strainer','Rain Bird','https://www.rainbird.com/products/pressure-regulating-filter-rby','https://www.rainbird.com/sites/default/files/media/images/2017-11/PRFilterRBY.jpg',4,'Each tank area would have',['filter','pressure regulator','cleanable cartridge'])
add('p17','flowmeter','Hunter HC flow meter and accessible valve box; minimum flow still needs checking','Hunter Industries','https://shop.hunterirrigation.com/products/hunter-hc-flow-meter-for-hydrawise-controllers','https://shop.hunterirrigation.com/cdn/shop/files/HCFLOWinValveBox.png?v=1782332591',8,'A tank meter measures',['flow meter','valve box','pipe union'])
add('p18','valve','Hunter PGV-101G sector valve; electrical variant must be specified','Hunter Industries','https://shop.hunterirrigation.com/collections/valves','https://shop.hunterirrigation.com/cdn/shop/files/PGV-101G.png?v=1781109225&width=3840',4,'There are three ways to achieve',['sector valve','solenoid valve'])
add('p19','solenoid','Hunter DC-latching solenoid; not automatically compatible with twelve-volt outputs','Hunter Industries','https://shop.hunterirrigation.com/products/hunter-dc-latching-solenoid','https://shop.hunterirrigation.com/cdn/shop/files/HI_DC_Solenoid_002RT_1.png?v=1781044073',4,'A latching solenoid saves',['latching solenoid','actuator'])
add('p20','fittings','Rain Bird XF dripline tees, elbows and joining fittings','Rain Bird','https://www.rainbird.com/products/xf-dripline-insert-fittings','https://www.rainbird.com/sites/default/files/media/images/2017-11/XF_Fittings.jpg',4,'The manifold approach is particularly',['pipe fittings','tee','elbow','joiner'])
add('p21','dripper','Netafim PCJ on-line drip emitter; model-specific pressure requirement','Netafim','https://www.netafim.com/en/products-and-solutions/product-offering/drip-irrigation-products/pcj-online-dripper/','https://www.netafim.com/globalassets/products/drippers-and-dripperlines/pcj/pcj-min.png?v=4a48b0&width=1200&height=630&rmode=Min',4,'The Netafim dripper sheet reviewed',['drip emitter','pressure compensation'])
add('p22','vh400','Vegetronix VH400 sealed analogue moisture probe','Vegetronix','https://www.vegetronix.com/Products/VH400/','https://www.vegetronix.com/Products/VH400/VH400-Feature.jpg',5,'Commercial sealed capacitive probes',['Vegetronix VH400','capacitive probe'])
add('p23','tensiometer','IRROMETER SR water-filled tensiometer with pressure gauge','IRROMETER','https://www.irrometer.com/sensors.html','https://www.irrometer.com/images/product/212-1.png',5,'Matric tension describes',['tensiometer','ceramic cup','pressure gauge'])
add('p24','watermark','IRROMETER WATERMARK 200SS granular-matrix sensor','IRROMETER','https://www.irrometer.com/sensors.html','https://www.irrometer.com/images/product/200SS_3.png',5,'Matric tension describes',['Watermark','granular matrix','gypsum sensor reference'])
add('p25','temperature','Encapsulated DS18B20 temperature probe; example supplied by Adafruit','Adafruit Industries','https://www.adafruit.com/product/381','https://www.adafruit.com/images/480x360/381-01.jpg',5,'Matric tension describes',['temperature probe','DS18B20'])
add('p26','waterboxx','Groasis Waterboxx reusable reservoir','Groasis','https://www.waterboxx.com/product-categorie/groasis-waterboxx-en/?lang=en','https://www.waterboxx.com/wp-content/uploads/2024/07/Waterboxx_1_pack-300x300.png',6,'Other local delivery methods deserve',['Groasis Waterboxx','reusable reservoir','wick supply'])
add('p28','olla','GrowOya porous clay watering pot; generic olla example','GrowOya','https://growoya.com/pages/what-is-an-oya','https://growoya.com/cdn/shop/files/untitled-3.jpg?v=1677548343&width=1024',6,'Porous pots and wicks could',['porous clay pot','olla'])
add('p30','gateway','Milesight UG65 LoRaWAN gateway; protected indoor station example','Milesight','https://www.milesight.com/iot/product/lorawan-gateway/ug65','https://www.milesight.com/static/og/en/iot/product/lorawan-gateway/lorawan-indoor-lorawan-gateway-ug65.png',7,'The communications drawing places',['LoRaWAN gateway','antenna','local network'])
add('p31','solar','Victron BlueSolar photovoltaic panel; illustrative size','Victron Energy','https://www.victronenergy.com.au/solar-pv-panels/bluesolar-panels','https://www.victronenergy.com/upload/products/205_918_20180709091855.png',9,'Low-power plant nodes may need',['solar panel','PV'])
add('p32','charge','Victron SmartSolar charge controller; illustrative device','Victron Energy','https://www.victronenergy.com/solar-charge-controllers/smartsolar-mppt-75-10-75-15-100-15-100-20','https://www.victronenergy.com/upload/products/smartsolar%20MPPT%2075%2015.png',9,'Low-power plant nodes may need',['charge controller','power conversion'])
add('p33','battery','Victron Lithium SuperPack NG battery; example, not the calculated project selection','Victron Energy','https://www.victronenergy.com/batteries/lithium-superpack-ng','https://www.victronenergy.com/upload/products/Lithium%20Superpack%2012%2C8V%20100Ah%20NG%20%28front%29.png',9,'Three days of that load requires',['battery','energy storage'])

# Higher-resolution and directly documented selections, replacing thumbnails or
# failed requests explicitly. They depict the same named product families.
revisions={
    'p05':dict(title='Milesight UC51x valve-controller hardware and interfaces',image_url='https://www.milesight.com/static/pc/en/iot/product/iot-controller/uc51x/new/uc51x-details.png?t=1793352602272'),
    'p06':dict(title='Dragino SE01 soil-sensor family; manufacturer documentation image',source_page='https://wiki.dragino.com/docs/LoRaWAN-End-Node/soil-agriculture-sensors/se01-lb/',image_url='https://wiki.dragino.com/assets/images/image-20240105090614-2-5310af3d2192ffb308fe6eee337446fa.png'),
    'p10':dict(title='PlantCare PlantControl CX controller',source_page='https://plant-care.ch/produkt/plantcontrol-cx-bewaesserungssteuerung-lora-funk-sensorverbindung/',image_url='https://plant-care.ch/wp-content/uploads/2022/08/DSC_2261-300x300.jpg'),
    'p11':dict(image_url='https://ars.els-cdn.com/content/image/1-s2.0-S2468067223000652-gr2_lrg.jpg'),
    'p12':dict(image_url='https://ars.els-cdn.com/content/image/1-s2.0-S2468067223000652-gr1_lrg.jpg'),
    'p30':dict(image_url='https://www.milesight.com/static/pc/en/iot/product/lorawan-gateway/ug65/new/ug65-indoor-lorawan-gateway.png'),
}
for entry in entries:
    if entry['id'] in revisions:
        entry.update(revisions[entry['id']])

add('p34','level','Milesight EM500-SWL submersible level probe; example sensor and radio package','Milesight','https://www.milesight.com/iot/product/lorawan-sensor/em500-swl','https://www.milesight.com/static/pc/en/iot/product/lorawan-sensor/em500-swl/em500-swl-submersible-water-level-sensor-1-small.png?t=1793352669002',5,'Tank level tells us inventory',['tank level','submersible probe'])
add('p35','ball-valve','U.S. Solid motorised ball valve; generic alternative to a solenoid valve','U.S. Solid','https://ussolid.com/collections/valves-us-solid-html','https://ussolid.com/cdn/shop/files/164f6aa22dfe9133669d00998b8bf755.jpg?v=1758090542&width=533',4,'Possible solutions are verified low-pressure',['motorised ball valve','motor actuator'])
add('p37','manual-tap','Irrigatia manual inline valve for isolation and controlled flushing','Irrigatia','https://shop.irrigatia.com/spares-tank-series-c60-c120-c180','https://shop.irrigatia.com/image/cache/catalog/HY4602C-800x800.JPG',4,'The manifold approach is particularly',['manual isolation','flush tap'])
add('p38','root-delivery','Rain Bird Root Watering System; buried delivery hardware example, not a planting-depth recommendation','Rain Bird','https://www.rainbird.com/products/root-watering-system','https://www.rainbird.com/sites/default/files/media/images/2017-11/RWS%20Full-Line.jpg',6,'Porous pots and wicks could',['buried water delivery','root delivery device'])
add('p39','budget-probe','DFRobot SEN0193 capacitive soil sensor board; prototype example requiring protection','DFRobot','https://www.dfrobot.com/product-1385.html','https://dfimg.dfrobot.com/enshop/SEN0193/SEN0193_Main_01.jpg',5,'Commercial sealed capacitive probes',['low-cost capacitance board','prototype electronics'])
add('p40','tubing','Irrigatia polyethylene feed-tube roll','Irrigatia','https://shop.irrigatia.com/spares-tank-series-c60-c120-c180','https://shop.irrigatia.com/image/cache/catalog/products/13mm-25m-roll-800x800.jpg',4,'The manifold approach is particularly',['feed pipe','polyethylene tubing'])
add('p41','battery-pack','Irrigatia replaceable rechargeable battery pack; kit-specific service part','Irrigatia','https://shop.irrigatia.com/spares-tank-series-c60-c120-c180','https://shop.irrigatia.com/image/cache/catalog/Battery-Pack-2200-800x800.png',10,'Use accessible screws, gaskets',['replaceable battery','service cassette'])

def download(e):
    try:
        r=requests.get(e['image_url'],timeout=30)
        r.raise_for_status()
        data=r.content
        with Image.open(BytesIO(data)) as im:
            im.load()
            fmt=im.format.lower()
            if im.width<100 or im.height<80:
                raise ValueError(f'Image too small: {im.size}')
            target=OUT/f'{e["id"]}-{e["slug"]}.png'
            im.save(target,format='PNG')
            pixels=list(im.size)
        original=ORIGINALS/f'{e["id"]}.{fmt}'
        original.write_bytes(data)
        result=dict(e,file=target.name,original_file=str(original.relative_to(HERE)),pixels=pixels,
                    source_sha256=hashlib.sha256(data).hexdigest(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),status='verified image')
        return result
    except Exception as exc:
        return dict(e,status='FAILED',error=str(exc))

if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=10) as ex:
        results=list(ex.map(download,entries))
    (HERE/'Photo acquisition.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    for e in results:
        print(e['id'],e['status'],str(e.get('pixels',e.get('error'))))
    failures=[e for e in results if e['status']=='FAILED']
    if failures:
        raise SystemExit(f'{len(failures)} image requests failed. Inspect Photo acquisition.json; no complete publication manifest was written.')
