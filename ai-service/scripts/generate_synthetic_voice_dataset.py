"""Generate a consent-safe offline Windows SAPI/FFmpeg voice benchmark corpus."""
from __future__ import annotations
import base64,json,os,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; FIXTURES=ROOT/"tests/fixtures"; AUDIO=FIXTURES/"audio"

PHRASES=[
("en-quiet-fever","en","quiet","Patient reports fever and cough for two days.",["fever","cough"],[],[],[]),
("en-normal-migraine","en","quiet","Patient reports migraine with nausea.",["migraine","nausea"],[],[],[]),
("en-fast-asthma","en","fast","Patient has asthma and shortness of breath.",["asthma","shortness of breath"],[],[],[]),
("en-slow-pneumonia","en","slow","The suspected diagnosis is pneumonia.",["pneumonia"],[],[],[]),
("en-fan-hypertension","en","noisy","Patient has hypertension and blood pressure is 140 over 90.",["hypertension","blood pressure"],[],["140 over 90"],[]),
("en-background-diabetes","en","noisy","Patient has diabetes and blood sugar is 180 milligrams per deciliter.",["diabetes","blood sugar"],[],["180 milligrams per deciliter"],[]),
("en-low-chest","en","low-volume","Patient reports chest pain.",["chest pain"],[],[],[]),
("en-clipped-abdominal","en","clipped","Patient reports abdominal pain and vomiting.",["abdominal pain","vomiting"],[],[],[]),
("en-paracetamol","en","medicine-heavy","Paracetamol 500 milligrams twice daily after food.",["Paracetamol"],["Paracetamol"],["500 milligrams","twice daily","after food"],[]),
("en-azithromycin","en","medicine-heavy","Azithromycin one tablet once daily after food.",["Azithromycin"],["Azithromycin"],["one tablet","once daily","after food"],[]),
("en-metformin","en","dosage-heavy","Metformin 500 milligrams twice daily before breakfast.",["Metformin"],["Metformin"],["500 milligrams","twice daily","before breakfast"],[]),
("en-pantoprazole","en","dosage-heavy","Pantoprazole 40 milligrams once daily before food.",["Pantoprazole"],["Pantoprazole"],["40 milligrams","once daily","before food"],[]),
("en-negation-fever","en","negation-heavy","Patient has no fever and denies chest pain.",["fever","chest pain"],[],[],["no","denies"]),
("en-allergy","en","negation-heavy","Patient has no known drug allergy.",["drug allergy"],[],[],["no"]),
("en-labs","en","medical-heavy","Doctor advised CBC LFT KFT and ECG.",["CBC","LFT","KFT","ECG"],[],[],[]),
("en-imaging","en","medical-heavy","Doctor advised MRI and CT scan after checking creatinine.",["MRI","CT scan","creatinine"],[],[],[]),
("hi-fever","hi","quiet","Mareez ko do din se bukhar aur khansi hai.",["bukhar","khansi"],[],[],[]),
("hi-headache","hi","quiet","Mareez ko migraine aur chakkar hai.",["migraine","chakkar"],[],[],[]),
("hi-fast-asthma","hi","fast","Mareez ko asthma aur saans lene mein takleef hai.",["asthma","saans lene mein takleef"],[],[],[]),
("hi-noisy-diabetes","hi","noisy","Mareez ko diabetes hai aur blood sugar zyada hai.",["diabetes","blood sugar"],[],[],[]),
("hi-hypertension","hi","medical-heavy","Mareez ko hypertension hai aur blood pressure 150 over 90 hai.",["hypertension","blood pressure"],[],["150 over 90"],[]),
("hi-metformin","hi","medicine-heavy","Mareez Metformin 500 milligrams twice daily leta hai.",["Metformin"],["Metformin"],["500 milligrams","twice daily"],[]),
("hi-paracetamol","hi","dosage-heavy","Paracetamol one tablet khane ke baad lena hai.",["Paracetamol"],["Paracetamol"],["one tablet"],[]),
("hi-negation","hi","negation-heavy","Mareez ko bukhar nahi hai aur chest pain se inkar karta hai.",["bukhar","chest pain"],[],[],["nahi","inkar"]),
("hi-labs","hi","medical-heavy","Doctor ne CBC LFT aur KFT test likhe hain.",["CBC","LFT","KFT"],[],[],[]),
("hi-imaging","hi","medical-heavy","Doctor ne ECG MRI aur CT scan karane ko kaha.",["ECG","MRI","CT scan"],[],[],[]),
("hinglish-fever","hi-Latn","hinglish","Patient ko do din se fever aur cough hai.",["fever","cough"],[],[],[]),
("hinglish-migraine","hi-Latn","hinglish","Patient ko migraine hai but diagnosis confirm nahi hai.",["migraine"],[],[],["nahi"]),
("hinglish-azithromycin","hi-Latn","medicine-heavy","Doctor ne Azithromycin once daily after food bola.",["Azithromycin"],["Azithromycin"],["once daily","after food"],[]),
("hinglish-pantoprazole","hi-Latn","dosage-heavy","Pantoprazole 40 milligrams before breakfast lena hai.",["Pantoprazole"],["Pantoprazole"],["40 milligrams","before breakfast"],[]),
("hinglish-negation","hi-Latn","negation-heavy","Patient ko no fever hai and denies chest pain.",["fever","chest pain"],[],[],["no","denies"]),
("hinglish-allergy","hi-Latn","negation-heavy","Patient bolta hai no known drug allergy.",["drug allergy"],[],[],["no"]),
("hinglish-diabetes","hi-Latn","medical-heavy","Diabetes ke liye Metformin 500 milligrams twice daily chal raha hai.",["Diabetes","Metformin"],["Metformin"],["500 milligrams","twice daily"],[]),
("hinglish-tests","hi-Latn","medical-heavy","Doctor ne CBC ECG and MRI advise kiya.",["CBC","ECG","MRI"],[],[],[]),
("browser-webm-en","en","browser-webm","Patient takes Paracetamol 500 milligrams twice daily.",["Paracetamol"],["Paracetamol"],["500 milligrams","twice daily"],[]),
("browser-webm-hinglish","hi-Latn","browser-webm","Patient ko asthma hai but no chest pain.",["asthma","chest pain"],[],[],["no"]),
("long-consultation-en","en","long-audio","Patient reports fever cough and migraine for three days. Patient denies chest pain and has no known drug allergy. Doctor advised CBC LFT KFT ECG MRI and CT scan. Patient takes Metformin 500 milligrams twice daily after food.",["fever","cough","migraine","CBC","LFT","KFT","ECG","MRI","CT scan"],["Metformin"],["500 milligrams","twice daily","after food"],["denies","no"]),
("long-consultation-hinglish","hi-Latn","long-audio","Patient ko fever aur khansi three days se hai. Chest pain nahi hai. Doctor ne CBC ECG aur CT scan advise kiya. Paracetamol 500 milligrams twice daily after food lena hai.",["fever","khansi","CBC","ECG","CT scan"],["Paracetamol"],["500 milligrams","twice daily","after food"],["nahi"]),
("medical-levothyroxine","en","medicine-heavy","Levothyroxine 50 micrograms once daily before breakfast.",["Levothyroxine"],["Levothyroxine"],["50 micrograms","once daily","before breakfast"],[]),
("medical-atorvastatin","en","medicine-heavy","Atorvastatin 10 milligrams once daily at bedtime.",["Atorvastatin"],["Atorvastatin"],["10 milligrams","once daily","at bedtime"],[]),
]

PS=r'''Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice($env:SYNTH_VOICE); $s.Rate=[int]$env:SYNTH_RATE; $s.Volume=[int]$env:SYNTH_VOLUME; $text=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:SYNTH_TEXT)); $s.SetOutputToWaveFile($env:SYNTH_OUTPUT); $s.Speak($text); $s.Dispose()'''

def synthesize(path:Path,text:str,index:int,rate:int=0,volume:int=100)->None:
    path.parent.mkdir(parents=True,exist_ok=True); env={**os.environ,"SYNTH_VOICE":"Microsoft David Desktop" if index%2==0 else "Microsoft Zira Desktop","SYNTH_RATE":str(rate),"SYNTH_VOLUME":str(volume),"SYNTH_TEXT":base64.b64encode(text.encode()).decode(),"SYNTH_OUTPUT":str(path)}
    subprocess.run(["powershell","-NoProfile","-Command",PS],env=env,check=True,capture_output=True)

def ffmpeg(source:Path,destination:Path,filters:str|None=None)->None:
    temporary=destination.with_suffix(destination.suffix+".tmp"+destination.suffix); cmd=["ffmpeg","-y","-loglevel","error","-i",str(source)]
    if filters: cmd += ["-af",filters]
    if destination.suffix==".webm": cmd += ["-c:a","libopus","-b:a","48k"]
    else: cmd += ["-ar","16000","-ac","1","-c:a","pcm_s16le"]
    cmd.append(str(temporary)); subprocess.run(cmd,check=True); temporary.replace(destination)

def main()->int:
    cases=[]
    for index,(identifier,language,category,text,terms,medicines,dosages,negations) in enumerate(PHRASES):
        extension=".webm" if category=="browser-webm" else ".wav"; relative=Path("audio")/language.replace("-","_")/(identifier+extension); output=FIXTURES/relative
        rate=3 if category=="fast" else (-3 if category=="slow" else 0); volume=35 if category=="low-volume" else 100
        wav=output if extension==".wav" else output.with_suffix(".source.wav"); synthesize(wav,text,index,rate,volume)
        if category=="noisy": ffmpeg(wav,output,"volume=0.9,highpass=f=70,lowpass=f=7800,afftdn=nf=-25")
        elif category=="clipped": ffmpeg(wav,output,"volume=8,alimiter=limit=0.98")
        elif extension==".webm": ffmpeg(wav,output); wav.unlink(missing_ok=True)
        else: ffmpeg(wav,output) if wav!=output else None
        cases.append({"id":identifier,"file":str(relative).replace("\\","/"),"category":category,"language":language,"expected_transcript":text,"important_terms":terms,"expected_negations":negations,"expected_dosages":dosages,"expected_medicines":medicines,"expected_tests":[x for x in terms if x.upper() in {"CBC","LFT","KFT","ECG","MRI","CT SCAN"}],"speaker_notes":"Offline Windows SAPI synthetic voice; native Hindi voice unavailable","noise_condition":category,"optional":False,"enabled":True,"consented":True,"synthetic_content":True,"contains_patient_data":False,"speaker_id":"sapi-david" if index%2==0 else "sapi-zira","tts_culture":"en-US"})
    manifest={"schema_version":2,"generator":"offline Windows System.Speech plus FFmpeg","limitations":["Only en-US voices were installed; Hindi and Hinglish pronunciation is non-native synthetic speech."],"cases":cases}; (FIXTURES/"voice_dataset_manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding="utf-8"); print(f"generated={len(cases)}"); return 0
if __name__=="__main__": raise SystemExit(main())
