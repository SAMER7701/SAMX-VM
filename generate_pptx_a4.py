#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAMX-VM: Visual Merchandising Audit Tool
A4 Portrait PowerPoint Presentation Generator (.pptx)
Generates an executive, print-ready A4 Portrait presentation strictly matching the PDF audit report layout.
Dimensions: A4 Portrait (Width: 8.27 in / 210 mm, Height: 11.69 in / 297 mm)
"""

import os
import sys
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_sample_image(text, subtitle, bg_color, accent_color, tag_text=""):
    """Creates a high quality stylized Visual Merchandising sample image with Pillow."""
    img_width, img_height = 800, 600
    image = Image.new("RGB", (img_width, img_height), bg_color)
    draw = ImageDraw.Draw(image)

    # Decorative background grid / architectural lines
    for x in range(0, img_width, 40):
        draw.line([(x, 0), (x, img_height)], fill=accent_color, width=1)
    for y in range(0, img_height, 40):
        draw.line([(0, y), (img_width, y)], fill=accent_color, width=1)

    # Center card
    card_margin = 60
    draw.rectangle(
        [(card_margin, card_margin), (img_width - card_margin, img_height - card_margin)],
        fill=(15, 23, 42),
        outline=accent_color,
        width=3
    )

    # VM Hanger / Display graphic representation
    cx, cy = img_width // 2, img_height // 2 - 30
    draw.ellipse([(cx - 70, cy - 70), (cx + 70, cy + 70)], fill=(30, 41, 59), outline=accent_color, width=2)
    draw.polygon([(cx - 40, cy + 20), (cx + 40, cy + 20), (cx, cy - 50)], fill=accent_color)

    # Labels
    draw.text((cx, cy + 100), text, fill=(255, 255, 255), anchor="mm")
    draw.text((cx, cy + 135), subtitle, fill=(203, 213, 225), anchor="mm")
    if tag_text:
        draw.text((cx, cy + 170), f"[{tag_text}]", fill=accent_color, anchor="mm")

    bio = BytesIO()
    image.save(bio, format="JPEG", quality=90)
    bio.seek(0)
    return bio


def build_a4_presentation(output_filepath="public/تقرير_تدقيق_VM_A4.pptx"):
    """Builds the entire A4 Portrait PowerPoint Presentation."""
    prs = Presentation()

    # 1. Set dimensions to A4 Portrait
    prs.slide_width = Inches(8.27)
    prs.slide_height = Inches(11.69)

    blank_layout = prs.slide_layouts[6]  # Blank slide

    # Color Palette matching SAMX-VM Core
    NAVY_950 = RGBColor(11, 19, 43)
    SLATE_900 = RGBColor(15, 23, 42)
    SLATE_800 = RGBColor(30, 41, 59)
    SLATE_700 = RGBColor(51, 65, 85)
    SLATE_600 = RGBColor(71, 85, 105)
    SLATE_400 = RGBColor(148, 163, 184)
    SLATE_200 = RGBColor(226, 232, 240)
    SLATE_100 = RGBColor(241, 245, 249)
    SLATE_50 = RGBColor(248, 250, 252)
    WHITE = RGBColor(255, 255, 255)
    GOLD_500 = RGBColor(234, 179, 8)
    GOLD_400 = RGBColor(250, 204, 21)
    GOLD_100 = RGBColor(254, 249, 195)
    EMERALD_600 = RGBColor(5, 150, 105)
    EMERALD_100 = RGBColor(209, 250, 229)
    ROSE_600 = RGBColor(225, 29, 72)
    ROSE_100 = RGBColor(255, 228, 230)
    AMBER_600 = RGBColor(217, 119, 6)
    AMBER_100 = RGBColor(254, 243, 199)

    # Audit Data Model
    audit_data = {
        "storeName": "فرع العليا العام - الرياض",
        "auditorName": "أحمد المهندس",
        "auditDate": "2026-10-30",
        "weekNumber": 43,
        "sections": [
            {
                "title": "واجهة المعرض الرئيسية ونقطة الجذب (Main Store Front & Mannequins)",
                "status": "resolved",
                "statusLabel": "تم المعالجة والتنسيق (Resolved)",
                "tags": ["تناسق الألوان", "تبديل المانيكان", "توجيه الإضاءة"],
                "standards": [
                    "تناسق قصة الألوان (Color Story) وفق الدليل الشتوي المعتمد",
                    "تناسق مقاسات الملابس مع أبعاد المانيكان الرسمية",
                    "توجيه سبوت لايت الإضاءة بزاوية 45 درجة لتسليط الضوء على المنتجات المركزية"
                ],
                "notes": "تمت معالجة التوزيع اللوني في الواجهة الأمامية وتركيب التشكيلة الرسمية الجديدة بنجاح، مما رفع مستوى الجاذبية البصرية عند المدخل.",
                "beforeLabel": "الوضع السابق - قبل التدقيق والتعديل",
                "afterLabel": "بعد التنفيذ والاعتماد الميداني (After VM Action)"
            },
            {
                "title": "حائط العرض الترويجي الرئيسي (Main Action / Focal Wall)",
                "status": "store_followup",
                "statusLabel": "مهمة متابعة ملزمة للفرع (Store Follow-up)",
                "assignee": "مدير المعرض (مشرف قسم الملابس الرجالية)",
                "dueDate": "خلال 5 أيام عمل (2026-11-05)",
                "tags": ["ترتيب تسلسل المقاسات", "توحيد العلاقات", "توفير نواقص المقاسات"],
                "standards": [
                    "توحيد اتجاه العلاقات الخشبية المعتمدة جهة اليسار",
                    "ترتيب المقاسات تصاعدياً من اليسار إلى اليمين (S إلى XXL)",
                    "توضيح بطاقات الأسعار والعروض الترويجية في أماكنها الصحيحة"
                ],
                "notes": "تمت إعادة ترتيب صفوف الملابس بنظام الطي، مع وجود نقص في مقاسي M و L؛ تم تكليف إدارة الفرع بطلب استكمال النواقص من المستودع المركزي فوراً.",
                "beforeLabel": "الوضع السابق - نقص المقاسات وعدم توحيد التعليق",
                "afterLabel": "بعد التنسيق الأولي وتوجيه إدارة الفرع بالمهام"
            },
            {
                "title": "طاولات العرض المركزية (Feature Display & Table Presentations)",
                "status": "resolved",
                "statusLabel": "تم المعالجة والتنسيق (Resolved)",
                "tags": ["تناسق الألوان", "نظام الطي المعتمد", "عرض الإكسسوارات"],
                "standards": [
                    "تطبيق نظام الطي المزدوج المعتمد لكافة القمصان والبلوفرات",
                    "تناسق الارتفاعات والتدرج البصري على مستويات الطاولة",
                    "توزيع الإكسسوارات التكميلية (أحزمة، محافظ) لتشجيع البيع المتقاطع"
                ],
                "notes": "تمت موازنة الارتفاعات وإضافة لمسات الإكسسوار التكميلية لتشجيع المبيعات المتقاطعة (Cross-selling) وفق أعلى معايير البراند.",
                "beforeLabel": "الوضع السابق - عشوائية في ارتفاعات الطي ونقص التنسيق",
                "afterLabel": "بعد تطبيق الطي المعياري والتوزيع الهرمي المتناسق"
            },
            {
                "title": "قسم الأحذية والحقائب الجلدية (Footwear & Leather Goods Zone)",
                "status": "management_action",
                "statusLabel": "طلب إجراء صيانة وتدخل إداري (Maintenance / Admin Action)",
                "assignee": "قسم الصيانة والتشغيل المركزي",
                "dueDate": "عاجل خلال 48 ساعة (2026-11-02)",
                "tags": ["صيانة الإضاءة", "تثبيت الرفوف", "فحص السبوت لايت"],
                "standards": [
                    "توجيه الإضاءة المسلطة على كل زوج أحذية معروض",
                    "استقامة وتثبيت أرفف العرض الجدارية بدقة متناهية",
                    "نظافة ومثالية عرض الجلود والأحذية دون غبار"
                ],
                "notes": "لوحظ وجود عطل كهربائي في مسار الإضاءة الجداري (Track Light) يسبب تعتيماً على الرفوف السفلية؛ تم رفع تذكرة صيانة رسمية عاجلة.",
                "beforeLabel": "الوضع السابق - تعتيم جزئي وعطل في مسار الإضاءة",
                "afterLabel": "الإجراء المؤقت وتوثيق موقع الخلل للصيانة"
            }
        ]
    }

    # =========================================================================
    # SLIDE 1: Cover & Executive Summary (A4 Portrait - 8.27 x 11.69 inches)
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)

    # Background Shape
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(8.27), Inches(11.69))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY_950
    bg1.line.color.rgb = NAVY_950

    # Top Gold Header Accent Bar
    top_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(8.27), Inches(0.18))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = GOLD_500
    top_bar.line.fill.background()

    # Brand Title Box
    badge = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(0.6), Inches(3.2), Inches(0.55))
    badge.fill.solid()
    badge.fill.fore_color.rgb = SLATE_800
    badge.line.color.rgb = GOLD_500
    badge.line.width = Pt(1.5)
    tf_b = badge.text_frame
    tf_b.word_wrap = True
    p_b = tf_b.paragraphs[0]
    p_b.text = "SAMX-VM | التقرير الميداني الرسمي"
    p_b.font.bold = True
    p_b.font.size = Pt(12)
    p_b.font.color.rgb = GOLD_400
    p_b.alignment = PP_ALIGN.CENTER

    # Main Headline Store Name
    store_title_box = slide1.shapes.add_textbox(Inches(0.6), Inches(1.3), Inches(7.07), Inches(1.2))
    tf_st = store_title_box.text_frame
    tf_st.word_wrap = True
    p_st = tf_st.paragraphs[0]
    p_st.text = audit_data["storeName"]
    p_st.font.bold = True
    p_st.font.size = Pt(28)
    p_st.font.color.rgb = WHITE
    p_st.alignment = PP_ALIGN.RIGHT

    p_sub = tf_st.add_paragraph()
    p_sub.text = "العرض المرئي والتنسيق التجاري • Visual Merchandising Audit Report"
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = SLATE_400
    p_sub.alignment = PP_ALIGN.RIGHT

    # 4 Metadata Info Boxes (2x2 Grid) - ONLY: Store Name, Specialist Name, Audit Date, Total Sections
    info_items = [
        ("اسم المعرض / الفرع", audit_data["storeName"], GOLD_500),
        ("أخصائي العرض المرئي (Auditor)", audit_data["auditorName"], GOLD_400),
        ("تاريخ الجولة الميدانية", audit_data["auditDate"], EMERALD_600),
        ("إجمالي الأقسام الموثقة", f"{len(audit_data['sections'])} أقسام بالمعرض", WHITE)
    ]

    card_w = Inches(3.4)
    card_h = Inches(1.1)
    grid_positions = [
        (Inches(0.6), Inches(2.7)),
        (Inches(4.27), Inches(2.7)),
        (Inches(0.6), Inches(4.0)),
        (Inches(4.27), Inches(4.0))
    ]

    for (label, val, col), (cx, cy) in zip(info_items, grid_positions):
        c_shape = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        c_shape.fill.solid()
        c_shape.fill.fore_color.rgb = SLATE_800
        c_shape.line.color.rgb = SLATE_700
        c_shape.line.width = Pt(1)

        # Small color tag bar
        tag = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx + card_w - Inches(0.1), cy + Inches(0.15), Inches(0.1), Inches(0.8))
        tag.fill.solid()
        tag.fill.fore_color.rgb = col
        tag.line.fill.background()

        tf_c = c_shape.text_frame
        tf_c.word_wrap = True
        p1 = tf_c.paragraphs[0]
        p1.text = label
        p1.font.size = Pt(10)
        p1.font.color.rgb = SLATE_400
        p1.alignment = PP_ALIGN.RIGHT

        p2 = tf_c.add_paragraph()
        p2.text = val
        p2.font.bold = True
        p2.font.size = Pt(14)
        p2.font.color.rgb = WHITE
        p2.alignment = PP_ALIGN.RIGHT

    # Statistics & Section Overview Card
    summary_card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(5.35), Inches(7.07), Inches(4.8))
    summary_card.fill.solid()
    summary_card.fill.fore_color.rgb = SLATE_900
    summary_card.line.color.rgb = SLATE_700
    summary_card.line.width = Pt(1.5)

    tf_sum = summary_card.text_frame
    tf_sum.word_wrap = True
    p_h = tf_sum.paragraphs[0]
    p_h.text = "📋 جدول ملخص أقسام المعرض وحالات المعالجة المعتمدة:"
    p_h.font.bold = True
    p_h.font.size = Pt(13)
    p_h.font.color.rgb = GOLD_400
    p_h.alignment = PP_ALIGN.RIGHT

    # List summary of sections on Cover Slide
    for idx, s in enumerate(audit_data["sections"]):
        p_item = tf_sum.add_paragraph()
        p_item.text = f"\n  {idx + 1}. {s['title']}"
        p_item.font.bold = True
        p_item.font.size = Pt(11)
        p_item.font.color.rgb = WHITE
        p_item.alignment = PP_ALIGN.RIGHT

        p_desc = tf_sum.add_paragraph()
        status_symbol = "✓" if s["status"] == "resolved" else ("⚠️" if s["status"] == "store_followup" else "🚨")
        p_desc.text = f"      [{status_symbol} {s['statusLabel']}] • الوسوم: {' | '.join(s['tags'])}"
        p_desc.font.size = Pt(9.5)
        p_desc.font.color.rgb = GOLD_400 if s["status"] == "store_followup" else (ROSE_600 if s["status"] == "management_action" else EMERALD_600)
        p_desc.alignment = PP_ALIGN.RIGHT

    # =========================================================================
    # SLIDES 2..N: Section Audit Slides in A4 Portrait Layout
    # =========================================================================
    for idx, sec in enumerate(audit_data["sections"]):
        slide = prs.slides.add_slide(blank_layout)

        # Clean executive light background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(8.27), Inches(11.69))
        bg.fill.solid()
        bg.fill.fore_color.rgb = SLATE_50
        bg.line.fill.background()

        # 1. Slide Top Banner (Section Title & Status)
        header_shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(0.4), Inches(7.27), Inches(1.1))
        header_shape.fill.solid()
        header_shape.fill.fore_color.rgb = SLATE_900
        header_shape.line.color.rgb = SLATE_700
        header_shape.line.width = Pt(1)

        # Number Badge #
        badge_shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.1), Inches(0.55), Inches(0.5), Inches(0.5))
        badge_shape.fill.solid()
        badge_shape.fill.fore_color.rgb = GOLD_500
        badge_shape.line.fill.background()
        tf_num = badge_shape.text_frame
        p_num = tf_num.paragraphs[0]
        p_num.text = f"#{idx + 1}"
        p_num.font.bold = True
        p_num.font.size = Pt(14)
        p_num.font.color.rgb = SLATE_900
        p_num.alignment = PP_ALIGN.CENTER

        # Section Title text
        tf_h = header_shape.text_frame
        tf_h.word_wrap = True
        p_ht = tf_h.paragraphs[0]
        p_ht.text = sec["title"]
        p_ht.font.bold = True
        p_ht.font.size = Pt(13)
        p_ht.font.color.rgb = WHITE
        p_ht.alignment = PP_ALIGN.RIGHT

        # Status badge line
        p_st = tf_h.add_paragraph()
        p_st.text = f"الحالة: {sec['statusLabel']}  |  الوسوم: {' • '.join(sec['tags'])}"
        p_st.font.size = Pt(9.5)
        p_st.font.bold = True
        p_st.font.color.rgb = GOLD_400 if sec["status"] == "store_followup" else (ROSE_600 if sec["status"] == "management_action" else EMERALD_600)
        p_st.alignment = PP_ALIGN.RIGHT

        # 2. Before / After Images (Stacked vertically with optimal aspect ratios for A4 Portrait)
        img_w = Inches(7.27)
        img_h = Inches(2.7)

        # --- Top Image: Before Audit ---
        before_y = Inches(1.65)
        
        # Banner for Before
        before_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), before_y, img_w, Inches(0.35))
        before_bar.fill.solid()
        before_bar.fill.fore_color.rgb = ROSE_100
        before_bar.line.color.rgb = ROSE_600
        before_bar.line.width = Pt(1)
        tf_bb = before_bar.text_frame
        p_bb = tf_bb.paragraphs[0]
        p_bb.text = f"🔴 {sec['beforeLabel']}"
        p_bb.font.bold = True
        p_bb.font.size = Pt(10.5)
        p_bb.font.color.rgb = ROSE_600
        p_bb.alignment = PP_ALIGN.RIGHT

        # Generate stylized Before Image
        before_stream = create_sample_image(
            text=sec["title"],
            subtitle="الوضع السابق الميداني قبل إجراء التعديل",
            bg_color=(30, 41, 59),
            accent_color=(239, 68, 68),
            tag_text="BEFORE AUDIT"
        )
        slide.shapes.add_picture(before_stream, Inches(0.5), before_y + Inches(0.35), width=img_w, height=img_h)

        # --- Bottom Image: After VM Action ---
        after_y = Inches(4.85)

        # Banner for After
        after_bar = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), after_y, img_w, Inches(0.35))
        after_bar.fill.solid()
        after_bar.fill.fore_color.rgb = EMERALD_100
        after_bar.line.color.rgb = EMERALD_600
        after_bar.line.width = Pt(1)
        tf_ab = after_bar.text_frame
        p_ab = tf_ab.paragraphs[0]
        p_ab.text = f"🟢 {sec['afterLabel']}"
        p_ab.font.bold = True
        p_ab.font.size = Pt(10.5)
        p_ab.font.color.rgb = EMERALD_600
        p_ab.alignment = PP_ALIGN.RIGHT

        # Generate stylized After Image
        after_stream = create_sample_image(
            text=sec["title"],
            subtitle="الوضع المعتمد بعد تطبيق معايير العرض المرئي",
            bg_color=(15, 23, 42),
            accent_color=(16, 185, 129),
            tag_text="AFTER VM ACTION"
        )
        slide.shapes.add_picture(after_stream, Inches(0.5), after_y + Inches(0.35), width=img_w, height=img_h)

        # 3. Standards & Follow-up Action Box
        details_y = Inches(8.05)
        details_h = Inches(3.0)

        det_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), details_y, img_w, details_h)
        det_card.fill.solid()
        det_card.fill.fore_color.rgb = WHITE
        det_card.line.color.rgb = SLATE_200
        det_card.line.width = Pt(1.5)

        tf_d = det_card.text_frame
        tf_d.word_wrap = True

        # VM Standards
        p_std_h = tf_d.paragraphs[0]
        p_std_h.text = f"معايير الـ VM المعتمدة المطبقة للقسم ({len(sec['standards'])} معايير):"
        p_std_h.font.bold = True
        p_std_h.font.size = Pt(11)
        p_std_h.font.color.rgb = AMBER_600
        p_std_h.alignment = PP_ALIGN.RIGHT

        for std in sec["standards"]:
            p_s = tf_d.add_paragraph()
            p_s.text = f"  ✓ {std}"
            p_s.font.size = Pt(9.5)
            p_s.font.color.rgb = SLATE_700
            p_s.alignment = PP_ALIGN.RIGHT

        # Action Task if followup/management action
        if sec["status"] in ["store_followup", "management_action"]:
            p_act = tf_d.add_paragraph()
            is_f = sec["status"] == "store_followup"
            p_act.text = f"\n⚠️ {'تكليف متابعة للفرع' if is_f else 'طلب إجراء صيانة وتدخل إداري'}:"
            p_act.font.bold = True
            p_act.font.size = Pt(10.5)
            p_act.font.color.rgb = AMBER_600 if is_f else ROSE_600
            p_act.alignment = PP_ALIGN.RIGHT

            p_act_val = tf_d.add_paragraph()
            p_act_val.text = f"    المسؤول عن التنفيذ: {sec.get('assignee', 'مدير المعرض')}  |  تاريخ الإنجاز المستهدف: {sec.get('dueDate', 'خلال أسبوع')}"
            p_act_val.font.bold = True
            p_act_val.font.size = Pt(9.5)
            p_act_val.font.color.rgb = SLATE_900
            p_act_val.alignment = PP_ALIGN.RIGHT

        # Notes
        p_not_h = tf_d.add_paragraph()
        p_not_h.text = "\nالملاحظات والمبررات الميدانية:"
        p_not_h.font.bold = True
        p_not_h.font.size = Pt(10.5)
        p_not_h.font.color.rgb = SLATE_900
        p_not_h.alignment = PP_ALIGN.RIGHT

        p_not = tf_d.add_paragraph()
        p_not.text = f"  {sec['notes']}"
        p_not.font.size = Pt(9.5)
        p_not.font.color.rgb = SLATE_600
        p_not.alignment = PP_ALIGN.RIGHT

        # Slide Footer (Page info)
        ft = slide.shapes.add_textbox(Inches(0.5), Inches(11.15), img_w, Inches(0.4))
        tf_ft = ft.text_frame
        p_ft = tf_ft.paragraphs[0]
        p_ft.text = f"{audit_data['storeName']}  |  صفحة {idx + 2} من {len(audit_data['sections']) + 2}"
        p_ft.font.size = Pt(8.5)
        p_ft.font.color.rgb = SLATE_400
        p_ft.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # FINAL SLIDE: Approvals & Signatures (A4 Portrait Layout)
    # =========================================================================
    slide_final = prs.slides.add_slide(blank_layout)

    bg_fin = slide_final.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(8.27), Inches(11.69))
    bg_fin.fill.solid()
    bg_fin.fill.fore_color.rgb = NAVY_950
    bg_fin.line.fill.background()

    # Title Box
    fin_title = slide_final.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(0.8), Inches(7.07), Inches(0.9))
    fin_title.fill.solid()
    fin_title.fill.fore_color.rgb = SLATE_800
    fin_title.line.color.rgb = GOLD_500
    fin_title.line.width = Pt(1.5)
    tf_fint = fin_title.text_frame
    p_ftitle = tf_fint.paragraphs[0]
    p_ftitle.text = "الاعتمادات والتوصيات الميدانية الرسمية | Official Sign-off"
    p_ftitle.font.bold = True
    p_ftitle.font.size = Pt(15)
    p_ftitle.font.color.rgb = GOLD_400
    p_ftitle.alignment = PP_ALIGN.CENTER

    # 2 Sign-off Cards
    sign_boxes = [
        ("اعتماد أخصائي العرض المرئي (VM Specialist)",
         "أقر بأن كافة الملاحظات والصور المرفقة تم توثيقها ميدانياً بدقة وفق معايير العلامة التجارية.",
         audit_data["auditorName"],
         "التوقيع: ...................................................."),
        ("اعتماد وملاحظات إدارة المعرض (Store Manager)",
         "تم الاطلاع على نتائج التدقيق الميداني والالتزام بإنهاء مهام المتابعة المحددة ضمن التواريخ الموضحة.",
         audit_data["storeName"],
         "الختم والتوقيع: ............................................")
    ]

    for i, (title, desc, name, sign_placeholder) in enumerate(sign_boxes):
        sy = Inches(2.1) + i * Inches(3.2)
        box = slide_final.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), sy, Inches(7.07), Inches(2.9))
        box.fill.solid()
        box.fill.fore_color.rgb = SLATE_800
        box.line.color.rgb = SLATE_700
        box.line.width = Pt(1)

        tf_b = box.text_frame
        tf_b.word_wrap = True
        pb1 = tf_b.paragraphs[0]
        pb1.text = title
        pb1.font.bold = True
        pb1.font.size = Pt(13)
        pb1.font.color.rgb = GOLD_400
        pb1.alignment = PP_ALIGN.RIGHT

        pb2 = tf_b.add_paragraph()
        pb2.text = f"\n{desc}\n"
        pb2.font.size = Pt(10)
        pb2.font.color.rgb = SLATE_200
        pb2.alignment = PP_ALIGN.RIGHT

        pb3 = tf_b.add_paragraph()
        pb3.text = f"الاسم / الفرع: {name}\n"
        pb3.font.bold = True
        pb3.font.size = Pt(11)
        pb3.font.color.rgb = WHITE
        pb3.alignment = PP_ALIGN.RIGHT

        pb4 = tf_b.add_paragraph()
        pb4.text = sign_placeholder
        pb4.font.size = Pt(11)
        pb4.font.color.rgb = SLATE_400
        pb4.alignment = PP_ALIGN.RIGHT

    # Recommendations card
    rec_box = slide_final.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(8.7), Inches(7.07), Inches(1.8))
    rec_box.fill.solid()
    rec_box.fill.fore_color.rgb = SLATE_900
    rec_box.line.color.rgb = GOLD_500
    rec_box.line.width = Pt(1)

    tf_rec = rec_box.text_frame
    tf_rec.word_wrap = True
    pr1 = tf_rec.paragraphs[0]
    pr1.text = "📌 توجيهات وتوصيات عامة لفريق المعرض:"
    pr1.font.bold = True
    pr1.font.size = Pt(11)
    pr1.font.color.rgb = GOLD_400
    pr1.alignment = PP_ALIGN.RIGHT

    pr2 = tf_rec.add_paragraph()
    pr2.text = "1. الحفاظ على استمرارية تسلسل المقاسات (S إلى XXL) بصورة يومية عند افتتاح المعرض.\n" \
               "2. فحص وضبط زوايا إضاءة السبوت لايت دورياً للتأكد من تسليطها المباشر على المنتجات البطلة (Hero Products).\n" \
               "3. الالتزام بتطبيق قصص الألوان المعتمدة (Color Stories) على واجهات العرض الرئيسية ومداخل الأقسام."
    pr2.font.size = Pt(9.5)
    pr2.font.color.rgb = SLATE_200
    pr2.alignment = PP_ALIGN.RIGHT

    # Ensure output directory exists
    out_dir = os.path.dirname(output_filepath)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    prs.save(output_filepath)
    print(f"Presentation successfully created at: {output_filepath}")
    return output_filepath

if __name__ == "__main__":
    out_path = "public/تقرير_تدقيق_VM_A4.pptx"
    if len(sys.argv) > 1:
        out_path = sys.argv[1]
    build_a4_presentation(out_path)
