from django.contrib.auth import get_user_model
print(list(get_user_model().objects.values('id','username')))
