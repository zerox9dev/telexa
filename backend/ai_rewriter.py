from openai import AsyncOpenAI


DEFAULT_PROMPT = (
    "You are a copywriter for a Telegram channel. "
    "Rewrite the post in a fresh, engaging style. "
    "Preserve all facts. Return ONLY the rewritten text."
)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
LOCAL_BASE_URL = "http://localhost:1234/v1"
LOCAL_MODEL = "llama-3.2-3b-instruct"
DEFAULT_MODEL = "openai/gpt-4o-mini"


# Cache clients by (base_url, api_key). Each AsyncOpenAI owns an httpx pool;
# creating one per request leaked connections.
_clients: dict[tuple[str, str], AsyncOpenAI] = {}


def _get_client(base_url: str, api_key: str) -> AsyncOpenAI:
    key = (base_url, api_key)
    client = _clients.get(key)
    if client is None:
        client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        _clients[key] = client
    return client


async def close_clients() -> None:
    for client in _clients.values():
        try:
            await client.close()
        except Exception:
            pass
    _clients.clear()


async def rewrite_post(
    text: str,
    api_key: str,
    prompt: str | None = None,
    use_local: bool = False,
    model: str | None = None,
) -> str:
    if use_local or not api_key:
        client = _get_client(LOCAL_BASE_URL, "lm-studio")
        model_name = LOCAL_MODEL
    else:
        client = _get_client(OPENROUTER_BASE_URL, api_key)
        model_name = model or DEFAULT_MODEL

    response = await client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": prompt or DEFAULT_PROMPT},
            {"role": "user", "content": text},
        ],
        max_tokens=1000,
    )

    return response.choices[0].message.content or ""
