import pdfplumber
import re
import numpy as np
import logging
from typing import Dict, Any
import spacy

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIDocumentAnalyzer:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Spacy model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Spacy model: {e}")
            self.nlp = None

        self.common_skills = [
            # --- Technical Skills ---
            "python", "java", "javascript", "c++", "c#", "ruby", "php", "sql", "r", "matlab",
            "go", "swift", "kotlin", "typescript", "html", "css", "react", "angular", "vue.js",
            "node.js", "django", "flask", "spring", "asp.net", "mysql", "postgresql", "mongodb",
            "redis", "oracle", "sqlite", "tensorflow", "pytorch", "scikit-learn", "pandas",
            "numpy", "hadoop", "spark", "big data", "aws", "azure", "gcp", "docker", "kubernetes",
            "jenkins", "git", "github", "gitlab", "devops", "linux", "windows server", "networking",
            "cybersecurity", "penetration testing", "cloud computing", "ansible", "terraform",
            "bash", "powershell", "power bi", "tableau", "excel", "machine learning",
            "data science", "data analysis", "etl", "sas", "spreadsheets",

            # --- Salesforce & CRM ---
            "salesforce", "hubspot", "zoho", "crm", "sales operations", "lead generation",
            "sales strategy", "pipeline management",

            # --- Marketing & Content ---
            "marketing", "digital marketing", "seo", "sem", "content marketing", "email marketing",
            "google ads", "facebook ads", "social media marketing", "social media management",
            "campaign management", "market research", "brand management", "copywriting",
            "content creation", "influencer marketing", "video editing", "adobe photoshop",
            "adobe illustrator", "adobe premiere", "canva",

            # --- Business, Finance & Ops ---
            "project management", "agile", "scrum", "kanban", "jira", "confluence", "microsoft project",
            "financial analysis", "budgeting", "forecasting", "accounting", "bookkeeping", "quickbooks",
            "sap", "oracle financials", "risk management", "compliance", "erp", "operations management",
            "process improvement", "six sigma", "lean", "business analysis", "strategy", "stakeholder management",

            # --- Human Resources ---
            "hr", "recruitment", "talent acquisition", "onboarding", "training", "employee relations",
            "performance management", "payroll", "benefits administration", "workday", "people analytics",

            # --- Education & Training ---
            "curriculum design", "instructional design", "lesson planning", "teaching", "e-learning",
            "blackboard", "moodle", "google classroom", "classroom management",

            # --- Logistics & Supply Chain ---
            "logistics", "supply chain", "inventory management", "warehouse management",
            "procurement", "shipping", "freight", "sap scm", "forecasting", "demand planning",

            # --- Healthcare & Medicine ---
            "clinical research", "patient care", "nursing", "medical coding", "epic", "emr", "ehr",
            "pharmaceutical", "healthcare administration", "medical billing", "radiology", "telemedicine",

            # --- Legal & Compliance ---
            "legal research", "contract management", "litigation", "compliance", "paralegal",
            "document review", "corporate law", "intellectual property", "risk assessment",

            # --- Electronics & Communication Engineering (ECE) ---
            "embedded systems", "vlsi", "verilog", "systemverilog", "fpga", "rtl design", "pcb design",
            "altium designer", "proteus", "multisim", "cadence", "xilinx vivado", "keil", "arm cortex",
            "microcontrollers", "iot", "signal processing", "matlab simulink", "antennas",
            "wireless communication", "digital electronics", "analog electronics", "control systems",
            "labview", "oscilloscope", "soldering", "circuit design", "power electronics", "arduino",
            "raspberry pi", "uart", "spi", "i2c",

            # --- Factory, Manufacturing & Industrial Engineering ---
            "plc", "scada", "hmi", "automation", "siemens tia portal", "solidworks", "autocad", "catia",
            "ansys", "cnc programming", "lean manufacturing", "six sigma", "kaizen", "tpm",
            "5s methodology", "process optimization", "quality control", "industrial safety",
            "preventive maintenance", "inventory control", "production planning", "manufacturing operations",
            "mechatronics", "material handling", "factory operations", "root cause analysis",
            "statistical process control",

            # --- Soft Skills ---
            "communication", "teamwork", "problem solving", "leadership", "time management",
            "adaptability", "creativity", "critical thinking", "collaboration", "empathy",
            "decision making", "conflict resolution", "negotiation", "active listening",
            "emotional intelligence", "persuasion", "strategic thinking", "resilience"
        ]


        # Expanded section keywords
        self.section_keywords = {
            "experience": ["experience", "work history", "employment", "professional experience", "career", "job history"],
            "education": ["education", "academic", "degree", "qualification", "studies", "training", "certifications"],
            "skills": ["skills", "expertise", "competencies", "abilities", "technical skills", "proficiencies"],
            "summary": ["summary", "profile", "objective", "overview", "about", "introduction"],
            "projects": ["projects", "portfolio", "works", "initiatives", "assignments"],
            "contact": ["contact", "email", "phone", "address", "connect", "reach me"],
            "achievements": ["achievements", "accomplishments", "awards", "honors", "recognitions","extra-curricular"],
            "certifications": ["certifications", "credentials", "licenses", "certificates"]
        }

    def extract_text_from_pdf(self, file) -> str:
        """Extract text from PDF."""
        try:
            with pdfplumber.open(file) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            logger.info(f"Extracted {len(text)} characters from PDF")
            return text
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    def extract_text(self, file) -> str:
        """Extract text from supported file formats."""
        filename = file.name.lower()
        try:
            if filename.endswith('.pdf'):
                return self.extract_text_from_pdf(file)
            elif filename.endswith('.txt'):
                content = file.read()
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                return content
            else:
                raise ValueError(f"Unsupported file format: {filename}")
        except Exception as e:
            logger.error(f"Text extraction failed for {filename}: {e}")
            raise

    def _clean_and_prepare_text(self, text: str) -> str:
        """Clean and prepare text for analysis."""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\-.,;:()/@]', '', text)
        max_length = 2000
        if len(text) > max_length:
            sentences = text[:max_length].split('.')
            text = '.'.join(sentences[:-1]) + '.'
        return text.strip()

    def _is_valid_resume_text(self, text: str, doc) -> bool:
        """Check if text resembles a resume."""
        # Basic checks
        if len(text.strip()) < 50:
            return False
        if not re.search(r'[a-zA-Z]', text):  # No alphabetic content
            return False
        word_count = len(text.split())
        if word_count < 20:  # Too few words
            return False

        # Resume-specific checks
        resume_keywords = set(sum(self.section_keywords.values(), []) + self.common_skills)
        has_resume_content = any(keyword.lower() in text.lower() for keyword in resume_keywords)
        if not has_resume_content:
            return False

        # Sentence structure and coherence
        if doc:
            sentences = list(doc.sents)
            if len(sentences) < 3:  # Too few sentences
                return False
            meaningful_tokens = [t for t in doc if t.is_alpha and not t.is_stop]
            if len(meaningful_tokens) < 15:  # Too few meaningful words
                return False
            # Basic coherence: Check for random text
            if len(meaningful_tokens) / max(1, len(doc)) < 0.3:  # Low meaningful token ratio
                return False

        return True

    def analyze_document(self, text: str) -> Dict[str, Any]:
        """Analyze document with accurate scoring."""
        try:
            cleaned_text = self._clean_and_prepare_text(text)
            doc = self.nlp(cleaned_text) if self.nlp else None

            # Validate resume content
            if not self._is_valid_resume_text(text, doc):
                logger.warning("Text does not resemble a resume")
                return {
                    'overall_score': 0,
                    'subscores': {
                        'impact_results': 0,
                        'skills_relevance': 0,
                        'formatting': 0,
                        'conciseness': 0,
                        'section_completeness': 0
                    },
                    'recommendations': "Document does not appear to be a resume. Please upload a valid resume with relevant sections and content."
                }

            # Word count and lines
            word_count = len(cleaned_text.split())
            lines = [len(line.strip()) for line in text.split('\n') if line.strip()]

            impact_score = 0
            if doc:
                # Expanded action verbs list
                action_verbs = [
                    "led", "developed", "managed", "built", "implemented", "improved", "designed", "achieved", "optimized", "delivered",
                    "created", "engineered", "orchestrated", "executed", "initiated", "formulated", "launched", "oversaw", "streamlined",
                    "facilitated", "coordinated", "deployed", "administered", "enhanced", "constructed", "restructured", "directed",
                    "negotiated", "proposed", "analyzed", "researched", "evaluated", "innovated", "drafted", "authored", "upgraded",
                    "revised", "automated", "accelerated", "mentored", "mobilized", "championed", "consolidated", "influenced", "secured",
                    "integrated", "refined", "monitored", "budgeted"
                ]
                
                # Count action verbs in doc using lemma (base form)
                verb_count = sum(1 for token in doc if token.lemma_.lower() in action_verbs)
                impact_score += min(30, verb_count * 5)  # +5 per verb, max 30
                
                # Expanded achievement keywords, including participatory/completion words
                achievement_pattern = r'(increased|reduced|saved|generated|improved|achieved|boosted|cut|raised|gained|doubled|tripled|' \
                                    r'enhanced|delivered|maximized|minimized|optimized|automated|accelerated|decreased|' \
                                    r'participated|won|completed|currently|finalized|secured|attained|earned|awarded).*?' \
                                    r'(\d+%|[\$\£€₹]\d+|\d+\s*(users|clients|projects|customers|teams|sales|leads|deals|profit|ROI|revenue))?'
                
                achievements = len(re.findall(achievement_pattern, text, re.I))
                impact_score += min(50, achievements * 10)  # +10 per achievement, max 50
                
                # Keyword density (alpha tokens excluding stopwords)
                keyword_density = len([t for t in doc if t.is_alpha and not t.is_stop]) / max(1, len(doc))
                impact_score += min(20, int(keyword_density * 100))  # Max 20
                
            impact_score = max(0, min(100, impact_score))


            # Skills score
            skills_score = 0
            if doc:
                unique_skills = set(token.text.lower() for token in doc if token.text.lower() in self.common_skills)
                skills_score += min(80, len(unique_skills) * 5)  # +5 per skill, max 80
                skill_density = len(unique_skills) / max(1, word_count) * 100
                skills_score += min(20, int(skill_density * 10))  # Max 20
            skills_score = max(0, min(100, skills_score))

            # Formatting score
            formatting_score = 0
            section_breaks = len(re.findall(r'\n\s*\n|[-*]{2,}', text))
            formatting_score += min(20, section_breaks * 5)  # +5 per break, max 20
            bullet_count = len(re.findall(r'[•\-*]\s', text))
            formatting_score += min(20, bullet_count * 2)  # +2 per bullet, max 20
            if lines:
                line_std = np.std(lines)
                formatting_score += max(0, 20 - int(line_std / 5))  # Max 20
            headings = len([line for line in text.split('\n') if line.strip() and len(line.strip()) < 50 and line.strip().istitle()])
            formatting_score += min(20, headings * 5)  # +5 per heading, max 20
            if doc:
                coherence_ratio = len([t for t in doc if t.is_alpha and not t.is_stop]) / max(1, len(doc))
                formatting_score += min(20, int(coherence_ratio * 50))  # Max 20
            formatting_score = max(0, min(100, formatting_score))

            # Conciseness score
            conciseness_score = 0

            if word_count < 400: 
                ideal_range = (200, 600)
            elif word_count < 800: 
                ideal_range = (400, 1000)
            else: 
                ideal_range = (800, 1500)

            base_score = 80  
            if ideal_range[0] <= word_count <= ideal_range[1]:
                conciseness_score = base_score
            else:
                if word_count < ideal_range[0]:
                    deviation = ideal_range[0] - word_count
                else:
                    deviation = word_count - ideal_range[1]

                penalty = (deviation // 100) * 10
                conciseness_score = max(0, base_score - penalty)

            conciseness_score = min(100, conciseness_score)


            # Completeness score
            section_count = 0
            if doc:
                detected_sections = set()
                for section, keywords in self.section_keywords.items():
                    for keyword in keywords:
                        if keyword.lower() in cleaned_text.lower():
                            detected_sections.add(section)
                            break
                        keyword_doc = self.nlp(keyword)
                        for token in doc:
                            if token.text.lower() not in self.section_keywords[section] and token.has_vector and keyword_doc.has_vector:
                                if token.similarity(keyword_doc) > 0.7:
                                    detected_sections.add(section)
                                    break
                section_count = len(detected_sections)
            completeness_score = min(100, section_count * 12)  # +12 per section, max 96

            # Overall score
            overall_score = int(
                0.3 * impact_score +
                0.3 * skills_score +
                0.15 * formatting_score +
                0.15 * conciseness_score +
                0.1 * completeness_score
            )

            # Recommendations
            recommendations = []
            if section_count < 4:
                recommendations.append("Add missing resume sections (e.g., experience, education, skills)")
            if word_count < 200:
                recommendations.append("Expand content with detailed descriptions and achievements")
            if skills_score < 50:
                recommendations.append("Include more specific skills relevant to your target role")
            if impact_score < 50:
                recommendations.append("Add quantifiable achievements (e.g., 'increased sales by 20%')")
            recommendations.append("Ensure clear section headings and consistent formatting")

            return {
                'overall_score': overall_score,
                'subscores': {
                    'impact_results': int(impact_score),
                    'skills_relevance': int(skills_score),
                    'formatting': int(formatting_score),
                    'conciseness': int(conciseness_score),
                    'section_completeness': int(completeness_score)
                },
                'recommendations': ". ".join(recommendations)
            }

        except Exception as e:
            logger.error(f"Document analysis failed: {e}")
            return {
                'overall_score': 0,
                'subscores': {
                    'impact_results': 0,
                    'skills_relevance': 0,
                    'formatting': 0,
                    'conciseness': 0,
                    'section_completeness': 0
                },
                'recommendations': "Document processing failed. Please upload a valid resume."
            }