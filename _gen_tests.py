import os  
base = r'C:\workspace\personal-finance-manager'  
def w(name, content):  
    full = os.path.join(base, name)  
    os.makedirs(os.path.dirname(full), exist_ok=True)  
    with open(full, 'w', encoding='utf-8') as f:  
        f.write(content)  
    print(f'Written: {name}') 
w('src/utils/storage.test.ts', open(r'C:\workspace\personal-finance-manager\_test_content.txt').read())  
