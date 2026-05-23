# -*- coding: utf-8 -*- 
import os 
base = r'C:\workspace\personal-finance-manager' 
def w(name, content): 
    full = os.path.join(base, name) 
    os.makedirs(os.path.dirname(full), exist_ok=True) 
    with open(full, 'w', encoding='utf-8') as f: 
        f.write(content) 
    print(f'Written: {name}') 
ECHO is on.
import os 
