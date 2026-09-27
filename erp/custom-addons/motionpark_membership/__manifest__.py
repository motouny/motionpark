{
    'name': 'Motion Park Membership',
    'version': '19.0.1.0.0',
    'category': 'Motion Park',
    'summary': 'Motion Park membership products on product.template',
    'author': 'Motion Park',
    'depends': ['product', 'sale', 'account', 'motionpark_core'],
    'data': [
        'security/ir.model.access.csv',
        'views/product_template_views.xml',
        'views/motionpark_membership_menus.xml',
    ],
    'application': False,
    'installable': True,
    'license': 'LGPL-3',
}
