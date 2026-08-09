<div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-direction:row;flex-wrap:wrap;margin-bottom:6px;">
	<img src="./frontend/public/logo.svg" alt="SehatSetu logo" style="width:56px;height:auto;display:block;" />
	<div style="display:flex;flex-direction:column;align-items:flex-start;">
		<div style="display:flex;align-items:center;gap:6px;">
			<span style="font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-weight:800;font-size:28px;color:#ffffff;">Sehat</span>
			<span style="font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-weight:800;font-size:28px;color:#ffffff;">Setu</span>
		</div>
		<div style="font-size:13px;color:#ffffff;margin-top:2px;">Modern Healthcare Portal</div>
	</div>
</div>
<div align="center">





> **🌐 AI & Machine Learning Powered Rural & Urban Healthcare Platform**

</div>


**SehatSetu** is an **AI and Machine Learning-powered healthcare platform**, built as a **Progressive Web App**, that reimagines how patients across India connect with certified doctors — closing the gap of distance, fragmented records, and language barriers with a single, intelligent digital bridge. It brings together telemedicine, automated clinical documentation, electronic health records, multilingual interaction, and personalized health guidance into one continuous experience, so that healthcare feels less like a series of disconnected visits and more like an ongoing relationship between patient and provider.

The platform is designed around a simple idea:

> **Quality healthcare should not depend on where a person lives.** 🏥

---

## ⚠️ The Healthcare Problem

India has made significant progress in healthcare infrastructure and technology, but access to quality medical care remains a challenge for many people.Patients in rural and underserved regions may have to travel long distances to reach qualified doctors. At the same time, overcrowded hospitals, expensive private healthcare, limited infrastructure, fragmented medical records, and shortages of healthcare professionals can make timely treatment difficult.

Language can also become a barrier when patients are more comfortable communicating in **Hindi, regional languages, or Hinglish**.

Another important challenge is the amount of manual work involved in healthcare documentation. During consultations, doctors need to listen to patients, understand their medical history, write prescriptions, document medicines and dosages, and provide follow-up instructions.

These challenges can affect both:

**👤 Patients**

* Difficulty reaching doctors
* Long travel times
* Communication barriers
* Difficulty maintaining medical records
* Limited access to continuous healthcare

**👨‍⚕️ Healthcare Professionals**

* Manual documentation
* Time-consuming prescription preparation
* Large amounts of patient information
* Difficulty maintaining continuity of care

SehatSetu is designed to address these challenges through a combination of **telemedicine, AI, automation, and digital healthcare infrastructure**.

---

## What is SehatSetu ?

SehatSetu is a digital healthcare platform that connects patients directly with certified doctors, removing the need to travel long distances or wait in overcrowded facilities just to receive basic medical attention. Patients can search for the right specialist based on their symptoms, book a consultation, and share relevant health details in advance — allergies, age, and current concerns — so the doctor walks into the video call already informed. The consultation itself happens over a secure video call, after which the platform's AI assists in converting the discussion into a structured, doctor-reviewed prescription, ensuring that documentation is accurate without adding extra manual work for the physician.

Beyond the consultation itself, SehatSetu functions as a continuous healthcare companion rather than a one-time service. Every prescription, medical report, and consultation record is stored in a centralized electronic health record, so a patient's medical history is available and organized for every future visit. The platform layers additional support on top of this — personalized diet recommendations based on the patient's condition, automated reminders for follow-ups and medication, and smart referrals to nearby hospitals when a case requires in-person or emergency attention. Together, these pieces make SehatSetu less of a video-calling app and more of a connected system that stays with the patient across their entire healthcare journey.

---

## 👤 Patient Experience

The patient journey is designed to make healthcare simpler and more organized.

**1️⃣ Access the Platform**
Because SehatSetu is a **Progressive Web App**, patients can access the platform directly through a web browser without needing to install a traditional mobile application. This is particularly useful for users who may have limited device storage or limited internet access.

**2️⃣ Find Healthcare**
Patients can search for doctors and identify the appropriate specialist based on their symptoms or healthcare requirements. The platform also supports **symptom-based doctor recommendations**, helping patients identify the appropriate specialist category.

**3️⃣ Pre-Consultation Information**
Before the consultation, patients can provide important information such as:
- 👤 Personal details
- 🎂 Age
- 🤧 Symptoms
- ⚠️ Allergies
- 📋 Relevant health information

This helps organize the information that may be needed during the consultation.

**4️⃣ Online Consultation**
The patient can join a video consultation with a doctor without physically travelling to a hospital or clinic. This makes healthcare more accessible to people who live far away from healthcare facilities.

**5️⃣ AI-Assisted Documentation**
During the consultation, speech-to-text technology can convert spoken information into text. AI-based processing can then help identify important medical information and structure it into prescription-related information such as:
- 💊 Medicine
- 📏 Dosage
- 🔄 Frequency
- ⏱️ Duration

The doctor can review and confirm the generated information before it becomes part of the patient's prescription.

**6️⃣ Digital Prescription & Records**
Once the consultation is completed, the patient's information and prescription can become part of their digital health record. This creates a centralized place for accessing:
- 📋 Medical history
- 💊 Previous prescriptions
- 🧪 Medical reports
- 🗂️ Other relevant health information

This can make future consultations more informed and organized.

**7️⃣ Follow-Up Care**
Healthcare does not end when a consultation ends. SehatSetu includes automated reminders for:
- 🔔 Follow-up consultations
- 💊 Medication schedules

This supports continuity of care and helps patients stay on track with their healthcare requirements.

---

## 👨‍⚕️ Doctor Experience

SehatSetu is designed not only for patients but also to support doctors during digital consultations.

Doctors can manage their consultation workflow, access patient information, conduct video consultations, and work with prescription information generated during the consultation.

One of the important aspects is **AI-assisted prescription documentation**. Instead of requiring doctors to manually write down every piece of information from a consultation, the platform can use speech recognition and AI processing to assist with documentation.

<div align="center">

**🎙️ Speech → 🧠 AI Processing → 📋 Structured Prescription**

</div>

The doctor remains responsible for reviewing and confirming the generated prescription information. This approach aims to reduce repetitive documentation work while keeping the healthcare professional involved in the final decision-making process.

---

## 🤖 Artificial Intelligence in SehatSetu

AI is one of the core components of the platform. Rather than using AI as a single chatbot feature, Sehat Setu incorporates AI into several parts of the healthcare workflow.

**🎙️ 1. Speech-to-Text**
**OpenAI Whisper** is used for converting spoken consultation information into text, reducing the amount of manual typing required during a consultation.

**🧠 2. Prescription Information Extraction**
**HuggingFace Transformers** are used for Named Entity Recognition (NER) to identify information such as:
- 💊 Medicine names
- 📏 Dosage
- 🔄 Frequency
- ⏳ Duration

This information can then be structured for prescription generation.

**💬 3. AI Health Chatbot**
The platform includes an AI-powered conversational assistant for:
- Preliminary symptom-related queries
- General health questions
- Doctor recommendations

The chatbot is intended as an assistance layer rather than a replacement for professional medical consultation.

**📚 4. Medical History Summarization**
AI can summarize relevant patient history, helping organize large amounts of previous healthcare information into a more manageable format.

**🌐 5. Multilingual AI Support**
The platform is designed to support **Hindi, regional languages, and Hinglish**, helping reduce language-related barriers. Regional speech-to-text support can also use **Bhashini / Google Speech-to-Text** as a fallback.

---

## 📂 Electronic Health Records

A major part of SehatSetu is the **Electronic Health Record (EHR)** system.

Instead of keeping medical information scattered across physical documents, previous prescriptions, or different healthcare visits, Sehat Setu provides centralized digital storage. The platform can maintain information such as:

- 📋 **Medical History**
- 💊 **Past Prescriptions**
- 🧪 **Lab Reports**
- 👨‍⚕️ **Consultation Information**

This allows healthcare information to remain available for future consultations and can help provide doctors with better context about a patient's previous healthcare journey.

---

## 🗣️ Multilingual Healthcare

Language should not prevent someone from accessing healthcare. SehatSetu therefore includes multilingual support for:

- 🇮🇳 Hindi
- 🌐 Regional languages
- 💬 Hinglish

This is particularly relevant for users who may not be comfortable communicating exclusively in English. The platform combines multilingual interaction with speech recognition and AI-based processing to make digital healthcare more accessible.

---

## 🥗 Personalized Health & Nutrition

Healthcare recommendations do not stop at diagnosis and medication.

SehatSetu also includes **diet and nutrition recommendations** based on the patient's condition. The platform can provide condition-based food guidance alongside the prescription, helping patients understand dietary considerations related to their healthcare needs.

---

## 🚨 Emergency & Offline Care

SehatSetu is designed to recognize situations where online healthcare may not be enough.

The platform includes **emergency symptom detection**, which can flag potentially urgent cases during the patient intake process. It also provides **smart referrals and nearby hospital lookup** so that patients can be directed toward offline healthcare when physical medical attention is required.

> ⚠️ **Important:** SehatSetu is not intended to replace emergency medical services. The project documentation directs patients requiring emergency care to local emergency services.

---

## 📶 Healthcare for Low-Connectivity Areas

Connectivity is an important consideration for rural healthcare.

SehatSetu includes a **low-bandwidth / audio-only mode**, allowing consultations to continue even when a stable video connection is difficult. The PWA architecture also provides offline support through service-worker caching, while reducing the need for users to download a large native application.

This makes the platform particularly suitable for environments where:

- 📶 Internet connectivity is limited
- 📱 Device storage is limited
- 🌐 Network quality changes frequently

---

## 💳 Payments & Digital Services

SehatSetu also integrates digital payment functionality for online consultations.

The platform uses **Razorpay** for consultation payments. Other integrations support different parts of the healthcare experience:

- ☁️ **Cloudinary** — medical reports, profile photos, and prescription PDFs
- 📍 **Google Maps Places API** — nearby hospital lookup
- 📱 **Twilio** — SMS reminders
- 📧 **Nodemailer / SendGrid** — email reminders

---

## 🏗️ System Architecture

SehatSetu uses a **multi-service architecture** where different technologies handle different responsibilities.

### 🎨 Frontend Layer
- React + Vite + TypeScript + Tailwind CSS — user-facing application
- Redux Toolkit + RTK Query — state management and API communication
- Vite PWA Plugin — installability and offline capabilities

### ⚙️ Backend Layer
- NestJS + Node.js — core backend framework
- PostgreSQL + Prisma ORM — data management
- JWT + refresh tokens + role-based access control — authentication
- BullMQ + Redis — background operations (reminders, notifications)

### 🤖 AI/ML Layer
- Python + FastAPI — dedicated AI service layer, kept separate from the core application
- 🎙️ Speech recognition
- 🧠 Medical information extraction
- 💬 AI chatbot functionality
- 📚 History summarization
- 🌐 Multilingual processing

### 🔐 Security & Privacy
- JWT-based authentication
- Role-based access control
- Password hashing using bcrypt
- Encrypted data at rest
- Explicit user consent
- Account deletion support
- Compliance considerations for India's Digital Personal Data Protection (DPDP) Act

### 🚀 DevOps & Development
- 🐳 Docker Compose — local multi-service development and orchestration
- 🔄 GitHub Actions — CI/CD (lint + build on push)
- 🔗 API Contracts — shared API contract across all modules to maintain consistency between services

---

## 🌍 The Vision

SehatSetu is more than an online doctor consultation platform.

It aims to create a **connected healthcare ecosystem** where:

<div align="center">

**Patient 👤**
↓
**Symptoms & Health Information 📝**
↓
**AI-Assisted Analysis 🤖**
↓
**Appropriate Doctor 👨‍⚕️**
↓
**Online Consultation 🎥**
↓
**AI-Assisted Documentation 📋**
↓
**Digital Prescription 💊**
↓
**Electronic Health Record 📂**
↓
**Personalized Recommendations 🥗**
↓
**Follow-Up & Continuous Care 🔔**
↓
**Offline Referral when Required 🏥**

</div>

This approach brings different stages of healthcare into one connected platform instead of treating every consultation as an isolated event.

---

## 🎯 Project Objective

The ultimate objective of **SehatSetu — Swasth AI** is to use technology to reduce the barriers between people and quality healthcare.

By combining:

- 🩺 Telemedicine
- 🤖 Artificial Intelligence
- 📂 Digital Health Records
- 🗣️ Multilingual Support
- 📱 Progressive Web Technology
- 🔔 Automated Healthcare Support

Sehat Setu aims to make healthcare **more accessible, efficient, intelligent, and patient-centric**, particularly for communities that face geographical, language, infrastructure, or connectivity barriers.

---

<div align="center">

## SehatSetu

### *"A digital bridge to better healthcare."*

**🌱 Accessible Healthcare • 🤖 Intelligent Assistance • 🩺 Connected Care • 🇮🇳 Healthcare for Everyone**

</div>
