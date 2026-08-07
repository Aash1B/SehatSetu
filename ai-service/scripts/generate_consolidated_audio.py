"""Generate normalized local-only audio from validated consolidated metadata."""
from __future__ import annotations
import base64,json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CONS=ROOT/"test/consolidated"; MAN=CONS/"manifests"; AUDIO=CONS/"voice/generated_audio"
PS=r'''Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice($env:SYNTH_VOICE); $s.Rate=[int]$env:SYNTH_RATE; $s.Volume=[int]$env:SYNTH_VOLUME; $t=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:SYNTH_TEXT)); $s.SetOutputToWaveFile($env:SYNTH_OUTPUT); $s.Speak($t); $s.Dispose()'''
def synth(path:Path,text:str,index:int):
    path.parent.mkdir(parents=True,exist_ok=True); raw=path.with_suffix(".raw.wav"); env={**os.environ,"SYNTH_VOICE":"Microsoft David Desktop" if index%2==0 else "Microsoft Zira Desktop","SYNTH_RATE":"0","SYNTH_VOLUME":"100","SYNTH_TEXT":base64.b64encode(text.encode()).decode(),"SYNTH_OUTPUT":str(raw)}; subprocess.run(["powershell","-NoProfile","-Command",PS],env=env,check=True,capture_output=True); subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(raw),"-ar","16000","-ac","1","-c:a","pcm_s16le",str(path)],check=True);raw.unlink()
def variant(source:Path,target:Path,filters:str,codec=None):
    target.parent.mkdir(parents=True,exist_ok=True);cmd=["ffmpeg","-y","-loglevel","error","-i",str(source),"-af",filters]
    cmd += (["-c:a","libopus","-b:a","48k"] if codec=="opus" else ["-ar","16000","-ac","1","-c:a","pcm_s16le"]);cmd.append(str(target));subprocess.run(cmd,check=True)
def entry(case,path,text,category,condition,variant_name="clean"):
    terms=case.get("medical_terms",[]);return {"id":case["id"] if variant_name=="clean" else f"{case['id']}__{variant_name}","source_case_id":case["id"],"file":str(Path("..")/path.relative_to(CONS)).replace("\\","/"),"category":category,"language":case["language"],"expected_transcript":text,"important_terms":terms,"expected_medicines":case.get("medicines",[]),"expected_dosages":case.get("dosages",[]),"expected_negations":case.get("negations",[]),"expected_tests":[x for x in terms if x.upper() in {"CBC","LFT","KFT","ECG","MRI","CT SCAN"}],"speaker_notes":"Windows SAPI en-US synthetic TTS; Hinglish is non-native","noise_condition":condition,"audio_variant":variant_name,"optional":False,"enabled":True,"consented":True,"synthetic_content":True,"contains_patient_data":False,"dataset_label":"synthetic TTS","tts_engine":"Windows System.Speech","tts_voice":"David" if int(re.sub(r'\D','',case['id']) or 0)%2==0 else "Zira","native_language_voice":case["language"]=="en"}
import re
def main():
    data=json.loads((MAN/"validated_voice_manifest.json").read_text(encoding="utf-8"));out=[];unsupported=[];index=0
    for case in data["cases"]:
        if not case.get("tts_supported"):unsupported.append({"id":case["id"],"reason":case.get("tts_reason")});continue
        text=case.get("generated_transcript") or case["expected_transcript"]; group="stress" if case["id"].startswith("ST") else ("hinglish" if case["language"]=="hi-Latn" else "english");clean=AUDIO/group/f"{case['id']}.wav";synth(clean,text,index);index+=1;out.append(entry(case,clean,text,"stress-generated" if case.get("generated_transcript") else case["category"],"clean"))
        if case["id"].startswith("ST"):
            mode=int(re.sub(r"\D","",case["id"]) or 0)%5;filters=["volume=0.35","atempo=1.25","atempo=0.8","volume=6,alimiter=limit=0.98","highpass=f=90,lowpass=f=6000"][mode];name=["low_volume","fast","slow","light_clipping","band_limited"][mode];target=AUDIO/"variants"/f"{case['id']}__{name}.wav";variant(clean,target,filters);out.append(entry(case,target,text,"stress-variant",name,name))
        if len([x for x in out if x.get("category")=="browser-webm"])<6 and (case["id"].endswith("001") or case["id"].endswith("002")):
            webm=AUDIO/"webm"/f"{case['id']}.webm";variant(clean,webm,"anull","opus");out.append(entry(case,webm,text,"browser-webm","clean-webm","webm"))
    manifest={"schema_version":1,"dataset_label":"synthetic TTS","cases":out,"unsupported_language_cases":unsupported,"notes":["Hindi-script cases were not generated because no Hindi SAPI voice is installed.","Hinglish uses non-native en-US voices and is reported separately."]};(MAN/"generated_audio_manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding="utf-8");print(json.dumps({"generated":len(out),"unsupported":len(unsupported)},indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
