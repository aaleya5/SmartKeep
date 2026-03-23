import re
import os

filepath = r'C:\Users\HP\Desktop\Aaleya\SmartKeep\fe\src\components\SettingsPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the inline style block
text = re.sub(r'\s*<style>\{`[\s\S]*?`\}</style>', '', text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Style block removed from SettingsPage.jsx")
