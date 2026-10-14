import unittest

from app import create_app, db


class AdminLoginTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_login_with_default_bootstrap_admin(self):
        resp = self.client.post(
            "/api/admin/login",
            json={"username": "saransh", "password": "Sara@123"},
        )
        self.assertEqual(resp.status_code, 200, resp.get_data(as_text=True))
        payload = resp.get_json()
        self.assertIn("token", payload)
        self.assertEqual(payload["admin"]["username"], "saransh")


if __name__ == "__main__":
    unittest.main()
