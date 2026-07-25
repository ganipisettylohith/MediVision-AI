import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def test_llm_module():
    print("Testing LLM Report Generation Pipeline...")
    from app.llm.prompt_builder import MedicalPromptBuilder
    from app.llm.report_generator import get_report_generator

    # 1. Test Prompt Construction
    prompt = MedicalPromptBuilder.build_prompt(
        prediction_class="PNEUMONIA",
        confidence_score=0.9842,
        probabilities={"NORMAL": 0.0158, "PNEUMONIA": 0.9842},
        gradcam_explanation="Neural activation is strongly localized in the Lower-Right Pulmonary Region.",
        modality="X-Ray",
        patient_id="PAT-99402"
    )
    print("=== Built Prompt Sample ===")
    print(prompt[:300] + "...\n")

    # 2. Test Report Generator Execution (with fallback if API key not set)
    generator = get_report_generator()
    report = generator.generate_report(
        prediction_class="PNEUMONIA",
        confidence_score=0.9842,
        probabilities={"NORMAL": 0.0158, "PNEUMONIA": 0.9842},
        gradcam_explanation="Neural activation is strongly localized in the Lower-Right Pulmonary Region.",
        modality="X-Ray",
        patient_id="PAT-99402"
    )

    print("=== Generated Medical Report ===")
    print(f"Summary         : {report['summary']}")
    print(f"Findings        : {report['findings']}")
    print(f"Interpretation  : {report['interpretation']}")
    print(f"Recommendations : {report['recommendations']}")
    print(f"Disclaimer      : {report['disclaimer']}")
    print("\nLLM pipeline test completed successfully!")

if __name__ == "__main__":
    test_llm_module()
