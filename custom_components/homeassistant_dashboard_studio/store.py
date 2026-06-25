"""Global dashboard project storage — one project per HA instance (all users)."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import DOMAIN, SIGNAL_PROJECT_UPDATED

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1


def normalize_project(data: dict[str, Any] | None) -> dict[str, Any] | None:
    """Return a valid {files, entry} project or None."""
    if not data:
        return None
    files = data.get("files")
    entry = data.get("entry")
    if not isinstance(files, dict) or not isinstance(entry, str) or not entry:
        return None
    if not files or entry not in files:
        return None
    return {"files": files, "entry": entry}


class DashboardStore:
    """Persists the dashboard under .storage/homeassistant_dashboard_studio."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store(hass, STORAGE_VERSION, DOMAIN)
        self._project: dict[str, Any] | None = None
        self._loaded = False

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        self._project = normalize_project(stored)
        self._loaded = True
        _LOGGER.debug(
            "[Debug dashboard_store]: loaded project (%s files)",
            len(self._project["files"]) if self._project else 0,
        )

    async def async_get(self) -> dict[str, Any] | None:
        if not self._loaded:
            await self.async_load()
        return self._project

    async def async_save(self, project: dict[str, Any]) -> None:
        normalized = normalize_project(project)
        if normalized is None:
            raise ValueError("Ungültiges Projekt — files und entry erforderlich.")

        await self._store.async_save(normalized)
        self._project = normalized
        self._loaded = True
        _LOGGER.debug(
            "[Debug dashboard_store]: saved %d file(s), entry=%s",
            len(normalized["files"]),
            normalized["entry"],
        )
        async_dispatcher_send(self._hass, SIGNAL_PROJECT_UPDATED, normalized)

    async def async_clear(self) -> None:
        await self._store.async_remove()
        self._project = None
        self._loaded = True
        _LOGGER.info("Global dashboard project cleared (reset to bundled default)")
        async_dispatcher_send(self._hass, SIGNAL_PROJECT_UPDATED, None)
