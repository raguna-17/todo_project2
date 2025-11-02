from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from .models import Task

@shared_task
def send_deadline_notifications():
    now = timezone.now()
    tasks = Task.objects.filter(deadline__lte=now, completed=False)
    for task in tasks:
        send_mail(
            subject=f"Task Deadline Alert: {task.title}",
            message=f"The task '{task.title}' is due!",
            from_email='noreply@example.com',
            recipient_list=[task.user.email]
        )
