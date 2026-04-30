"""사주구리 CLI — typer 기반 터미널 채팅."""

from __future__ import annotations
import asyncio
import uuid
from typing import Optional

import typer
from dotenv import load_dotenv
load_dotenv()

app = typer.Typer(name="sajuguri")


async def _run_chat(birth_date: str, birth_time: str | None, gender: str) -> None:
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    from langchain_core.messages import HumanMessage
    from engine.handlers.calculate_saju import handle_calculate_saju
    from llm.tools.saju_tools import extract_summary
    from llm.pipelines.chat import build_chat_graph
    from core.config import settings

    birth_info = {
        "birth_date": birth_date,
        "birth_time": birth_time,
        "gender": gender,
        "calendar": "solar",
        "is_leap_month": False,
    }

    typer.echo("사주를 분석하는 중...")
    saju = await asyncio.to_thread(handle_calculate_saju, **birth_info)
    saju_summary = extract_summary(saju)
    session_id = str(uuid.uuid4())

    async with await AsyncPostgresSaver.from_conn_string(settings.postgres_url) as checkpointer:
        await checkpointer.setup()
        graph = build_chat_graph(checkpointer)
        config = {
            "configurable": {
                "thread_id": session_id,
                "birth_info": birth_info,
            }
        }
        await graph.aupdate_state(config, {"birth_info": birth_info, "saju_summary": saju_summary})

        typer.echo(f"\n사주구리 상담을 시작합니다. ({saju_summary['day_stem']}일간 {saju_summary['gyeok_guk']})")
        typer.echo("종료: Ctrl+C\n")

        while True:
            try:
                user_input = typer.prompt("나")
            except (KeyboardInterrupt, EOFError):
                typer.echo("\n상담을 종료합니다.")
                break

            typer.echo("상담사: ", nl=False)
            async for event in graph.astream_events(
                {"messages": [HumanMessage(content=user_input)]},
                config=config,
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and chunk.content:
                        typer.echo(chunk.content, nl=False)
            typer.echo()


@app.command()
def chat(
    birth_date: Optional[str] = typer.Option(None, "--birth-date", "-d", help="생년월일 (YYYY-MM-DD)"),
    birth_time: Optional[str] = typer.Option(None, "--birth-time", "-t", help="태어난 시간 (HH:MM)"),
    gender: Optional[str] = typer.Option(None, "--gender", "-g", help="성별 (male/female)"),
):
    """사주 상담 채팅 시작."""
    if not birth_date:
        birth_date = typer.prompt("생년월일 (YYYY-MM-DD)")
    if not birth_time:
        birth_time_input = typer.prompt("태어난 시간 (모르면 엔터)", default="")
        birth_time = birth_time_input or None
    if not gender:
        gender = typer.prompt("성별 (male/female)")

    asyncio.run(_run_chat(birth_date, birth_time, gender))


if __name__ == "__main__":
    app()
