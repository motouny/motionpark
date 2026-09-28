{
    'name': 'Motion Park Core',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park core data models (branches, activities, membership rules, partner extensions)',
    'author': 'Motion Park',
    'depends': ['base', 'product'],
    'data': [
        'security/ir.model.access.csv',
        'views/branch_views.xml',
        'views/activity_views.xml',
        'views/membership_rule_views.xml',
        'views/res_partner_views.xml',
        'views/motionpark_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
