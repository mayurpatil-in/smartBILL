import urllib.request, urllib.error, json

try:
    req = urllib.request.Request(
        'http://localhost:8000/invoice/bulk-print', 
        data=b'{"invoice_ids":[1]}', 
        headers={'Content-Type': 'application/json'}
    )
    resp = urllib.request.urlopen(req)
    print("SUCCESS")
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
