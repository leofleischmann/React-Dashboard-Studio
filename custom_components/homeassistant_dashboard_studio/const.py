"""Constants for Home Assistant Dashboard Studio."""

DOMAIN = "homeassistant_dashboard_studio"
PANEL_TAG = "homeassistant-dashboard-studio-panel"
PANEL_URL_PATH = "homeassistant-dashboard-studio"
PANEL_TITLE = "Dashboard Studio"
PANEL_ICON = "mdi:view-dashboard-edit"

# Global workspace storage (.storage/homeassistant_dashboard_studio).
WS_TYPE_GET_WORKSPACE = f"{DOMAIN}/get_workspace"
WS_TYPE_SAVE_WORKSPACE = f"{DOMAIN}/save_workspace"
WS_TYPE_SUBSCRIBE_WORKSPACE = f"{DOMAIN}/subscribe_workspace"
SIGNAL_WORKSPACE_UPDATED = f"{DOMAIN}_workspace_updated"

CONF_CONFIRM_RESET = "confirm_reset"
