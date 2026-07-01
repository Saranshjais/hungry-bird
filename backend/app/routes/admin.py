from flask import Blueprint, render_template, redirect, url_for, flash
from app import db
from app.models import VendorSubmission, Vendor

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# 🔹 View all submissions
@admin_bp.route("/submissions")
def admin_submissions():
    submissions = VendorSubmission.query.order_by(
        VendorSubmission.created_at.desc()
    ).all()
    return render_template("admin_submissions.html", submissions=submissions)


# 🔹 Approve submission
@admin_bp.route("/submissions/<int:submission_id>/approve")
def admin_approve_submission(submission_id):
    sub = VendorSubmission.query.get_or_404(submission_id)

    # 🚨 Check location
    if sub.lat is None or sub.lng is None:
        flash("❌ Cannot approve: Missing Google Maps location!", "danger")
        return redirect(url_for("admin.admin_submissions"))

    # 🚨 Prevent duplicate
    existing = Vendor.query.filter_by(
        name=sub.stall_name,
        city_id=sub.city_id
    ).first()

    if existing:
        flash("⚠️ Vendor already exists.", "warning")
        return redirect(url_for("admin.admin_submissions"))

    # ✅ Create vendor (THIS WAS MISPLACED BEFORE)
    vendor = Vendor(
        city_id=sub.city_id,
        name=sub.stall_name,
        cuisine_type=sub.cuisine_type,
        is_hidden_gem=True,
        is_famous=False,
        avg_rating=None,
        price_level=sub.estimated_price,
        address_text=sub.approx_address,
        lat=sub.lat,
        lng=sub.lng,
        source="user",
        verified_status="verified",
    )

    db.session.add(vendor)
    db.session.delete(sub)
    db.session.commit()

    flash(f"✅ '{sub.stall_name}' approved and added!", "success")
    return redirect(url_for("admin.admin_submissions"))


# 🔹 Reject submission
@admin_bp.route("/submissions/<int:submission_id>/reject")
def admin_reject_submission(submission_id):
    sub = VendorSubmission.query.get_or_404(submission_id)

    db.session.delete(sub)
    db.session.commit()

    flash("❌ Submission rejected and removed.", "info")
    return redirect(url_for("admin.admin_submissions"))