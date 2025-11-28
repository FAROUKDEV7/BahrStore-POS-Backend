FROM python:3.12



ENV TZ=Africa/Cairo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone


WORKDIR /app


COPY . /app/


RUN pip install --upgrade pip
RUN pip install -r requirements.txt


EXPOSE 8000


CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
