"""Original offline sound design. No sampled commercial weapons or game assets.

Each pressure transient, action mechanism, debris grain and acoustic tail is
rendered to PCM, mastered, then encoded as AAC for native Safari decoding.
The editable design and deterministic seeds are the source of every asset.
"""
from pathlib import Path
import concurrent.futures, hashlib, json, math, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

RATE=44100
root=Path('dist/assets/audio');root.mkdir(parents=True,exist_ok=True)
work=Path(tempfile.mkdtemp(prefix='breachline-sound-'))
weapons=json.loads(Path('authoring/audio/weapons.json').read_text())
sounds=[]

def filtered(x,hz,mode='lowpass',order=2):
    return sosfilt(butter(order,hz,fs=RATE,btype=mode,output='sos'),x)

def impulse(t,rng,start,weight=1,tone=2200,decay=95):
    u=t-start;mask=(u>=0);u=np.maximum(u,0)
    n=rng.normal(0,1,len(t));impact=filtered(n,min(12000,tone*3),'lowpass')
    body=np.sin(math.tau*tone*u)+.38*np.sin(math.tau*tone*1.437*u)+.18*np.sin(math.tau*tone*2.11*u)
    return mask*weight*(impact*.26+body*.34)*np.exp(-u*decay)*(1-np.exp(-u*2200))

def register(key,variant,x):
    # 70 Hz headroom protects phone speakers; preserve useful low-mid punch.
    x=filtered(x,48,'highpass');x=np.tanh(x*.95)
    peak=np.max(np.abs(x))
    if peak>.001:x=x*.91/max(.91,peak)
    x[:90]*=np.linspace(0,1,90);x[-330:]*=np.linspace(1,0,330)
    sounds.append((key,variant,x.astype(np.float32)))

def shot(w,variant,suppressed=False):
    seed=72317+w['id']*1289+variant*3989+int(suppressed)*1921
    rng=np.random.default_rng(seed);kind=w['kind'];duration=.74 if kind in ('SNIPER','SHOTGUN','LMG') else .59
    t=np.arange(int(RATE*duration))/RATE;n=rng.normal(0,1,len(t))
    if kind=='MELEE':
        envelope=np.sin(np.minimum(1,t/.19)*math.pi)**2*(t<.19)
        register(('suppressed' if suppressed else 'shot')+str(w['id']),variant,filtered(n,3300)*envelope*.45+impulse(t,rng,.08,.26,2700,110));return
    bass={'RIFLE':135,'SMG':190,'SHOTGUN':83,'SNIPER':73,'MARKSMAN':107,'LMG':118,'PISTOL':210}[kind]*(.88+(w['id']%7)*.035)
    pressure=(np.sin(math.tau*bass*(t+.002*(1-np.exp(-t*160))))+.34*np.sin(math.tau*bass*1.56*t))*np.exp(-t*(35 if kind in ('SMG','PISTOL') else 19))
    crack=filtered(n,[1300,11700],'bandpass')*np.exp(-t*310)*(1-np.exp(-t*5200))
    chamber=filtered(n,1500)*np.exp(-t*35)*1.8
    air=filtered(n,[260,4200],'bandpass')*np.exp(-t*26)*(1-np.exp(-t*260))
    x=pressure*(.18 if suppressed else .58)+crack*(.13 if suppressed else .62)+chamber*(.28 if suppressed else .62)+air*(.08 if suppressed else .25)
    # Locked-breech opening, return spring and metallic closure are separate
    # transients, rather than one repeating pitched noise burst.
    x+=impulse(t,rng,.019+.003*variant,.27,2800+w['id']*47,150)
    x+=impulse(t,rng,.043,.14,4800+w['id']*33,95)
    if w['shellReload'] or kind=='SNIPER':
        x+=impulse(t,rng,.27,.27,940,72)+impulse(t,rng,.49,.42,1850,100)
    elif kind!='PISTOL':x+=impulse(t,rng,.17+variant*.014,.06,4200,70)
    # Sparse, decorrelated outdoor early returns. They read as a gunshot tail,
    # without convolving every source with a long response during gameplay.
    dry=x.copy()
    for seconds,gain in ((.039,.16),(.077,.115),(.129,.075),(.21,.033)):
        delay=int(seconds*RATE);tail=filtered(dry[:-delay],2300/(1+seconds*4));x[delay:]+=tail*gain*(.4 if suppressed else 1)
    x+=filtered(n,1900)*np.exp(-np.maximum(0,t-.035)*13)*(t>.035)*(.022 if suppressed else .065)
    register(('suppressed' if suppressed else 'shot')+str(w['id']),variant,x)

for w in weapons:
    for variant in range(3):shot(w,variant)
    for variant in range(2):shot(w,variant,True)
    rng=np.random.default_rng(8849+w['id']*193)
    duration=max(.22,w['reload']*.91);t=np.arange(int(RATE*duration))/RATE
    if w['shellReload']:
        x=impulse(t,rng,.019,.3,1180,50)+impulse(t,rng,.20,.57,2230,120)
    else:
        x=impulse(t,rng,duration*.105,.20,3500,140)+impulse(t,rng,duration*.18,.44,1050,85)
        x+=impulse(t,rng,duration*.61,.30,720,65)+impulse(t,rng,duration*.72,.64,1690,125)
        x+=filtered(rng.normal(0,1,len(t)),[220,2600],'bandpass')*.038*np.sin(t/duration*math.pi)**2
        if w['kind']=='LMG':x+=impulse(t,rng,duration*.40,.38,3100,55)+impulse(t,rng,duration*.85,.44,1020,100)
        if w['revolver']:x+=impulse(t,rng,duration*.36,.22,5100,30)
    register('reload'+str(w['id']),0,x)
    for key,duration,tone in (('seat',.19,1100),('rack',.28,2400)):
        t=np.arange(int(RATE*duration))/RATE
        x=impulse(t,rng,.009,.42,tone+w['id']*27,90)
        if key=='rack':x+=impulse(t,rng,.105,.64,1390+w['id']*18,95)+filtered(rng.normal(0,1,len(t)),4200)*.045*np.sin(np.minimum(1,t/.11)*math.pi)*(t<.11)
        register(key+str(w['id']),0,x)

# Granular boot foley: heel strike, toe roll, then irregular grit contacts.
for surface in ('Hard','Gravel','Soft','Snow','Quarry','Metal','Water'):
    for variant in range(4):
        rng=np.random.default_rng(19371+variant*997+sum(map(ord,surface)))
        t=np.arange(int(RATE*.31))/RATE;n=rng.normal(0,1,len(t))
        x=filtered(n,700)*np.exp(-t*26)*.62+impulse(t,rng,.007,.25,230,48)+impulse(t,rng,.071,.12,380,55)
        if surface in ('Gravel','Quarry'):
            for i in range(12):x+=impulse(t,rng,.024+rng.random()*.14,.025+rng.random()*.045,2400+rng.random()*2900,140)
        if surface=='Hard':x+=impulse(t,rng,.018,.24,1200,110)
        if surface=='Metal':x+=impulse(t,rng,.016,.21,2300,21)+impulse(t,rng,.042,.10,3900,35)
        if surface=='Soft':x=filtered(x,1500)*.74+n*.025*np.exp(-t*16)
        if surface=='Snow':x=filtered(x,1900)*.65+filtered(n,[1800,6500],'bandpass')*.15*np.exp(-t*14)
        if surface=='Water':x=filtered(x,900)*.5+filtered(n,[600,6900],'bandpass')*.29*np.exp(-t*14)*(1-np.exp(-t*110))
        register('step'+surface,variant,x)

for surface in ('Metal','Stone','Wood','Glass','Water'):
    for variant in range(3):
        rng=np.random.default_rng(39987+variant*1301+sum(map(ord,surface)));t=np.arange(int(RATE*.42))/RATE
        x=impulse(t,rng,.003,.49,1800+variant*171,95)
        if surface=='Metal':
            x+=sum(np.sin(math.tau*f*t)*np.exp(-t*(17+i*4))*.095 for i,f in enumerate((3190,4870,6910)))
        elif surface=='Stone':
            x+=filtered(rng.normal(0,1,len(t)),3900)*np.exp(-t*25)*.17
            for i in range(6):x+=impulse(t,rng,.028+i*.021,.045,2700+i*311,90)
        elif surface=='Wood':x=filtered(x,3600)+impulse(t,rng,.012,.34,480,55)
        elif surface=='Glass':
            for i in range(14):x+=impulse(t,rng,.006+i*.017,.038,3200+rng.random()*6700,60)
        else:x=filtered(rng.normal(0,1,len(t)),[900,7200],'bandpass')*.32*np.exp(-t*17)
        register('impact'+surface,variant,x)

for variant in range(3):
    rng=np.random.default_rng(998731+variant*3877);t=np.arange(int(RATE*1.65))/RATE;n=rng.normal(0,1,len(t))
    x=filtered(n,1400)*np.exp(-t*7)*1.25+np.sin(math.tau*(53+variant*4)*t)*np.exp(-t*6)*.8
    x+=filtered(n,[1900,11500],'bandpass')*np.exp(-t*160)*.6
    x+=filtered(n,400)*np.exp(-t*3.4)*.74
    for i in range(13):x+=impulse(t,rng,.12+i*.065,.065*(1-i/17),1500+rng.random()*2200,80)
    register('explosion',variant,x)

def encode(sound):
    key,variant,x=sound;name=key+'-'+str(variant);wav=work/(name+'.wav');aac=work/(name+'.m4a')
    with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((x*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','aac','-b:a','160k','-movflags','+faststart',str(aac)],check=True)
    return (key,variant,aac.read_bytes(),{'duration':len(x)/RATE,'pcmPeak':float(np.max(np.abs(x))),'pcmRms':float(np.sqrt(np.mean(x*x)))})

index={};data=bytearray()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for key,variant,encoded,metrics in pool.map(encode,sounds):
        index.setdefault(key,[]).append({'offset':len(data),'bytes':len(encoded),'variant':variant,**metrics});data.extend(encoded)
(root/'sound-bank.bin').write_bytes(data)
(root/'manifest.json').write_text(json.dumps({'schema':1,'codec':'AAC-LC in M4A','sampleRate':RATE,'originalDesign':True,'license':'Original Breachline project assets; no third-party samples','sounds':index,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()},indent=2)+'\n')
print('Original audio library',len(sounds),'recordings',len(data),'bytes',flush=True)
