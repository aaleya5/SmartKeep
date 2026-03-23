import re
import os

files = [
    r'C:\Users\HP\Desktop\Aaleya\SmartKeep\fe\src\components\ExplorePage.jsx',
    r'C:\Users\HP\Desktop\Aaleya\SmartKeep\fe\src\components\CollectionsPage.jsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Remove the inline style block
    text = re.sub(r'\s*<style>\{`[\s\S]*?`\}</style>', '', text)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Style block removed from {os.path.basename(filepath)}")
