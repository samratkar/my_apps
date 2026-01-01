import json

with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Clear all audio URLs
for shloka in data['shlokas']:
    shloka['audio'] = ''

with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Cleared all audio URLs for {len(data["shlokas"])} shlokas')
print('All shlokas now show input field for adding audio URLs')
