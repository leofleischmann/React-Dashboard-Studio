"""Global dashboard workspace storage — multiple projects per HA instance."""

from __future__ import annotations

import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import DOMAIN, SIGNAL_WORKSPACE_UPDATED

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 2
WORKSPACE_VERSION = 2
DEFAULT_PROJECT_ID = "default"
PROJECT_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")


def _is_project_slug(project_id: str) -> bool:
    return bool(PROJECT_SLUG_RE.match(project_id))


def normalize_project(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not data:
        return None
    files = data.get("files")
    entry = data.get("entry")
    if not isinstance(files, dict) or not isinstance(entry, str) or not entry:
        return None
    if not files or entry not in files:
        return None
    return {"files": files, "entry": entry}


def normalize_workspace(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not data or data.get("version") != WORKSPACE_VERSION:
        return None
    projects: dict[str, Any] = {}
    for project_id, raw in (data.get("projects") or {}).items():
        if not _is_project_slug(str(project_id)):
            continue
        core = normalize_project(raw)
        if core is None:
            continue
        name = raw.get("name") if isinstance(raw.get("name"), str) else str(project_id)
        name = name.strip() or str(project_id)
        projects[str(project_id)] = {"name": name, **core}
    if not projects:
        return None
    active = data.get("activeId")
    active_id = (
        str(active)
        if isinstance(active, str) and _is_project_slug(active) and active in projects
        else sorted(projects)[0]
    )
    return {"version": WORKSPACE_VERSION, "activeId": active_id, "projects": projects}


def migrate_to_workspace(stored: dict[str, Any] | None) -> dict[str, Any] | None:
    if not stored:
        return None
    as_v2 = normalize_workspace(stored)
    if as_v2:
        return as_v2
    legacy = normalize_project(stored)
    if legacy is None:
        return None
    return {
        "version": WORKSPACE_VERSION,
        "activeId": DEFAULT_PROJECT_ID,
        "projects": {
            DEFAULT_PROJECT_ID: {"name": "Dashboard", **legacy},
        },
    }


class DashboardStore:
    """Persists dashboards under .storage/homeassistant_dashboard_studio."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store(hass, STORAGE_VERSION, DOMAIN)
        self._workspace: dict[str, Any] | None = None
        self._loaded = False

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        self._workspace = migrate_to_workspace(stored)
        self._loaded = True
        count = len(self._workspace["projects"]) if self._workspace else 0
        _LOGGER.debug("[Debug dashboard_store]: loaded workspace (%s project(s))", count)

    async def async_get_workspace(self) -> dict[str, Any] | None:
        if not self._loaded:
            await self.async_load()
        return self._workspace

    async def async_save_workspace(self, workspace: dict[str, Any]) -> None:
        normalized = normalize_workspace(workspace)
        if normalized is None:
            raise ValueError("Ungültiger Workspace — projects und activeId erforderlich.")

        await self._store.async_save(normalized)
        self._workspace = normalized
        self._loaded = True
        _LOGGER.debug(
            "[Debug dashboard_store]: saved %d project(s), active=%s",
            len(normalized["projects"]),
            normalized["activeId"],
        )
        async_dispatcher_send(self._hass, SIGNAL_WORKSPACE_UPDATED, normalized)

    async def async_clear(self) -> None:
        await self._store.async_remove()
        self._workspace = None
        self._loaded = True
        _LOGGER.info("Global dashboard workspace cleared (reset to bundled default)")
        async_dispatcher_send(self._hass, SIGNAL_WORKSPACE_UPDATED, None)
