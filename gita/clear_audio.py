import json

with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for shloka in data['shlokas']:
    shloka['audio'] = ''

with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Cleared audio URLs for {len(data["shlokas"])} shlokas')
print('Users can now add their own audio URLs through the UI')
