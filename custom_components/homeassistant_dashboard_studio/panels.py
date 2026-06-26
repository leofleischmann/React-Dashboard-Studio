"""Dynamic sidebar panels — one HA panel per workspace project."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.loader import async_get_integration

from .const import (
    DOMAIN,
    PANEL_ICON,
    PANEL_TAG,
    panel_url_path,
)

_LOGGER = logging.getLogger(__name__)

DEFAULT_FALLBACK_PROJECT = "default"
DEFAULT_FALLBACK_TITLE = "Dashboard"


async def async_ensure_static_assets(hass: HomeAssistant) -> str:
    """Serve integration static files once; return versioned dashboard module URL."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if domain_data.get("static_registered"):
        return domain_data["module_url"]

    panel_dir = Path(__file__).parent
    static_url = f"/{DOMAIN}"
    # Bundle filenames are version-stamped (dashboard.v{version}.js), so a version
    # bump always busts the cache — safe to let the browser cache the ~640 KB
    # module instead of re-downloading it on every panel load.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(static_url, str(panel_dir), cache_headers=True)]
    )

    integration = await async_get_integration(hass, DOMAIN)
    module_url = f"{static_url}/dashboard.v{integration.version}.js"
    domain_data["static_registered"] = True
    domain_data["module_url"] = module_url
    _LOGGER.debug("[Debug dashboard_panels]: static assets at %s", module_url)
    return module_url


def _projects_for_sync(workspace: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    """Projects that should have a sidebar entry (fallback when store is empty)."""
    if workspace and workspace.get("projects"):
        return workspace["projects"]
    return {DEFAULT_FALLBACK_PROJECT: {"name": DEFAULT_FALLBACK_TITLE}}


@callback
def _register_project_panel(
    hass: HomeAssistant,
    *,
    project_id: str,
    title: str,
    module_url: str,
) -> None:
    """Register or update a sidebar panel bound to one workspace project."""
    url_path = panel_url_path(project_id)
    exists = frontend.async_panel_exists(hass, url_path)

    custom_panel_config = {
        "name": PANEL_TAG,
        "module_url": module_url,
        "embed_iframe": False,
        "trust_external": False,
    }
    config: dict[str, Any] = {
        "project_id": project_id,
        "_panel_custom": custom_panel_config,
    }

    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=title,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=url_path,
        config=config,
        require_admin=False,
        update=exists,
    )
    _LOGGER.debug(
        "[Debug dashboard_panels]: %s panel %s (%s)",
        "updated" if exists else "registered",
        url_path,
        project_id,
    )


@callback
def _remove_panel_if_exists(hass: HomeAssistant, url_path: str) -> None:
    if frontend.async_panel_exists(hass, url_path):
        frontend.async_remove_panel(hass, url_path)
        _LOGGER.debug("[Debug dashboard_panels]: removed panel %s", url_path)


async def async_sync_sidebar_panels(
    hass: HomeAssistant, workspace: dict[str, Any] | None
) -> None:
    """Align sidebar panels with workspace projects (add, update titles, remove orphans)."""
    module_url = await async_ensure_static_assets(hass)
    projects = _projects_for_sync(workspace)
    desired_paths = {panel_url_path(pid) for pid in projects}

    domain_data = hass.data.setdefault(DOMAIN, {})
    previous: set[str] = set(domain_data.get("panel_paths", ()))

    for project_id, project in projects.items():
        name = project.get("name") if isinstance(project.get("name"), str) else project_id
        title = (name or project_id).strip() or project_id
        _register_project_panel(
            hass,
            project_id=str(project_id),
            title=title,
            module_url=module_url,
        )

    for url_path in previous:
        if url_path not in desired_paths:
            _remove_panel_if_exists(hass, url_path)

    domain_data["panel_paths"] = desired_paths
    _LOGGER.info(
        "[Debug dashboard_panels]: synced %d sidebar panel(s)",
        len(desired_paths),
    )


async def async_unregister_all_panels(hass: HomeAssistant) -> None:
    """Remove every panel owned by this integration."""
    domain_data = hass.data.get(DOMAIN, {})
    for url_path in domain_data.get("panel_paths", ()):
        _remove_panel_if_exists(hass, url_path)
    domain_data.pop("panel_paths", None)
