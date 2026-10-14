from app import create_app

app = create_app()
client = app.test_client()
resp = client.post('/api/admin/login', json={'username': 'saransh', 'password': 'Sara@123'})
print('STATUS', resp.status_code)
print(resp.get_data(as_text=True))
