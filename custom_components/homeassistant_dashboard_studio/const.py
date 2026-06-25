"""Constants for Home Assistant Dashboard Studio."""

DOMAIN = "homeassistant_dashboard_studio"
PANEL_TAG = "homeassistant-dashboard-studio-panel"
# Config-entry title in Geräte & Dienste (not sidebar — panels come from workspace).
INTEGRATION_TITLE = "Dashboard Studio"
PANEL_ICON = "mdi:view-dashboard-edit"


def panel_url_path(project_id: str) -> str:
    """Frontend URL path for a workspace project sidebar entry."""
    return f"{DOMAIN}-{project_id}"

# Global workspace storage (.storage/homeassistant_dashboard_studio).
WS_TYPE_GET_WORKSPACE = f"{DOMAIN}/get_workspace"
WS_TYPE_SAVE_WORKSPACE = f"{DOMAIN}/save_workspace"
WS_TYPE_SUBSCRIBE_WORKSPACE = f"{DOMAIN}/subscribe_workspace"
SIGNAL_WORKSPACE_UPDATED = f"{DOMAIN}_workspace_updated"

CONF_CONFIRM_RESET = "confirm_reset"
