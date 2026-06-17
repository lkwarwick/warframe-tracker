import os
from nicegui import app, ui

# Serve static files from the static directory
app.add_static_files('/static', os.path.join(os.path.dirname(__file__), 'static'))

# Inject CSS into page head
ui.add_head_html('<link rel="stylesheet" href="/static/styles.css">')

ui.markdown('# Warframe Tracker').classes('h1')
ui.run(port=8081)
