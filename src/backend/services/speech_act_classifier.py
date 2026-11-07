import logging

logger = logging.getLogger("axiom.speech_act_classifier")

class SpeechActClassifierService:
    async def classify(self, text: str) -> list[dict]:
        # TODO: Implement actual speech act classification
        return []

speech_act_classifier_service = SpeechActClassifierService()
