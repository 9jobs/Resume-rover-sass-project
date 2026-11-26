"""Provider boundary. Disabled until configured and an implementation is verified."""
from typing import Protocol
class LLMClient(Protocol):
    def structured(self,task:str,source:dict,schema:dict)->dict: ...
class UnconfiguredClient:
    def structured(self,*args,**kwargs):
        raise RuntimeError("LLM rewriting is not configured. Local factual ordering remains available.")
def get_client():
    return UnconfiguredClient()
