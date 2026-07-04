import jwt
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import User, Vendor, Favorite, SavedVendor
from datetime import datetime, timedelta
from functools import wraps

auth_api = Blueprint("auth_api", __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # JWT is passed in the request header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
  
        try:
            # decoding the payload to fetch the stored details
            data = jwt.decode(token, current_app.config.get('SECRET_KEY', 'hungrybird-secret'), algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
  
    return decorated

@auth_api.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    email = email.lower().strip()

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    new_user = User(name=name, email=email)
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()

    # Generate token
    token = jwt.encode({
        'user_id': new_user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, current_app.config.get('SECRET_KEY', 'hungrybird-secret'), algorithm="HS256")

    return jsonify({
        "message": "Registered successfully",
        "token": token,
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }), 201


@auth_api.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    email = email.lower().strip()

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, current_app.config.get('SECRET_KEY', 'hungrybird-secret'), algorithm="HS256")

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }), 200


@auth_api.route('/api/auth/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email
        }
    }), 200

# -------------------- FAVORITES --------------------

@auth_api.route('/api/favorites', methods=['GET'])
@token_required
def get_favorites(current_user):
    favorites = Favorite.query.filter_by(user_id=current_user.id).all()
    results = []
    for fav in favorites:
        v = fav.vendor
        if v:
            results.append({
                "id": v.id,
                "name": v.name,
                "cuisine_type": v.cuisine_type,
                "city_name": v.city.name if v.city else "Unknown",
                "rating": v.avg_rating,
                "image_url": v.image_url,
                "is_hidden_gem": v.is_hidden_gem
            })
    return jsonify({"favorites": results}), 200

@auth_api.route('/api/favorites/toggle', methods=['POST'])
@token_required
def toggle_favorite(current_user):
    data = request.json
    vendor_id = data.get('vendor_id')
    
    if not vendor_id:
        return jsonify({"error": "vendor_id is required"}), 400
        
    fav = Favorite.query.filter_by(user_id=current_user.id, vendor_id=vendor_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
        return jsonify({"status": "removed"}), 200
    else:
        new_fav = Favorite(user_id=current_user.id, vendor_id=vendor_id)
        db.session.add(new_fav)
        db.session.commit()
        return jsonify({"status": "added"}), 201

# -------------------- USER HISTORY --------------------

@auth_api.route('/api/user/submissions', methods=['GET'])
@token_required
def get_user_submissions(current_user):
    from app.models import VendorSubmission
    submissions = VendorSubmission.query.filter_by(user_id=current_user.id).order_by(VendorSubmission.created_at.desc()).all()
    results = []
    for sub in submissions:
        results.append({
            "id": sub.id,
            "stall_name": sub.stall_name,
            "cuisine_type": sub.cuisine_type,
            "city_name": sub.city.name if sub.city else "Unknown",
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None
        })
    return jsonify({"submissions": results}), 200

@auth_api.route('/api/user/reviews', methods=['GET'])
@token_required
def get_user_reviews(current_user):
    from app.models import Rating
    ratings = Rating.query.filter_by(user_id=current_user.id).order_by(Rating.created_at.desc()).all()
    results = []
    for r in ratings:
        v = r.vendor
        if v:
            results.append({
                "id": r.id,
                "vendor_name": v.name,
                "city_name": v.city.name if v.city else "Unknown",
                "rating_value": r.rating_value,
                "review_text": r.review_text,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })
    return jsonify({"reviews": results}), 200

# -------------------- SAVED --------------------

@auth_api.route('/api/saved', methods=['GET'])
@token_required
def get_saved(current_user):
    saved = SavedVendor.query.filter_by(user_id=current_user.id).all()
    results = []
    for s in saved:
        v = s.vendor
        if v:
            results.append({
                "id": v.id,
                "name": v.name,
                "cuisine_type": v.cuisine_type,
                "city_name": v.city.name if v.city else "Unknown",
                "rating": v.avg_rating,
                "image_url": v.image_url,
                "is_hidden_gem": v.is_hidden_gem
            })
    return jsonify({"saved": results}), 200

@auth_api.route('/api/saved/toggle', methods=['POST'])
@token_required
def toggle_saved(current_user):
    data = request.json
    vendor_id = data.get('vendor_id')
    
    if not vendor_id:
        return jsonify({"error": "vendor_id is required"}), 400
        
    saved_item = SavedVendor.query.filter_by(user_id=current_user.id, vendor_id=vendor_id).first()
    if saved_item:
        db.session.delete(saved_item)
        db.session.commit()
        return jsonify({"status": "removed"}), 200
    else:
        new_saved = SavedVendor(user_id=current_user.id, vendor_id=vendor_id)
        db.session.add(new_saved)
        db.session.commit()
        return jsonify({"status": "added"}), 201
