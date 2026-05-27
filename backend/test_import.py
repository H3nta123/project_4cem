import requests

csv_data = """Дата;Категория;Описание;Сумма;Тип
2023-10-01;Продукты;Магазин;1500;expense
2023-10-02;Зарплата;Аванс;50000;income
"""

files = {'file': ('test.csv', csv_data, 'text/csv')}
response = requests.post('http://127.0.0.1:8000/api/import/csv', files=files)
print(response.json())
