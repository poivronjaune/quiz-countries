# SOURCE DATA : https://github.com/samayo/country-json

import json
import sys
import pandas as pd

with open('data/country-by-continent.json', 'r') as f:
    json_countries = json.load(f)
with open('data/country-by-abbreviation.json', 'r') as f:
    json_abbreviations = json.load(f)
with open('data/country-by-capital-city.json', 'r') as f:
    json_capitals = json.load(f)
for entry in json_capitals:
    if entry['city'] is None:
        entry['city'] = '' 

with open('data/country-by-domain-tld.json', 'r') as f:
    json_dot_url = json.load(f)
with open('data/country-by-iso-numeric.json', 'r') as f:
    json_iso_code = json.load(f)
for entry in json_iso_code:
    if entry['iso'] is None:
        entry['iso'] = ''   

with open('data/country-by-region-in-world.json', 'r') as f:
    json_region = json.load(f)
with open('data/country-by-yearly-average-temperature.json', 'r') as f:
    json_avgtmp = json.load(f)
for entry in json_avgtmp:
    if entry['temperature'] is None:
        entry['temperature'] = ''    

with open('data/country-by-currency-name.json', 'r') as f:
    json_currency = json.load(f)
with open('data/country-by-cities.json', 'r') as f:
    json_cities = json.load(f)


df_countries = pd.DataFrame(json_countries)
df_abbreviations = pd.DataFrame(json_abbreviations)
df_capitals = pd.DataFrame(json_capitals)
df_dot_url = pd.DataFrame(json_dot_url)
df_iso_code = pd.DataFrame(json_iso_code)
df_region = pd.DataFrame(json_region)
df_avgtmp = pd.DataFrame(json_avgtmp)
df_currency = pd.DataFrame(json_currency)
df_cities = pd.DataFrame(json_cities)


#print(df_cities)
#sys.exit()

countries_grouped = df_countries.groupby('continent')

continents = []
continent_id = 1
for continent, country_group in countries_grouped:
    country_items = []
    country_id = 1
    for name in list(country_group['country']):
        abbrev = df_abbreviations[df_abbreviations.get("country") == name].get("abbreviation").values
        capital = df_capitals[df_capitals.get("country") == name].get("city").values
        dot_url = df_dot_url[df_dot_url.get("country") == name].get("tld").values
        iso_code = df_iso_code[df_iso_code.get("country") == name].get("iso").values
        region = df_region[df_region.get("country") == name].get("location").values
        avgtmp = df_avgtmp[df_avgtmp.get("country") == name].get("temperature").values
        currency = df_currency[df_currency.get("country") == name].get("currency_name").values
        cities = df_cities[df_cities.get("country") == name].get("cities").values

        abbrev_str = '' if len(abbrev) < 1 else abbrev[0]
        capital_str = '' if len(capital) < 1 else capital[0]
        dot_url_str = '' if len(dot_url) < 1 else dot_url[0]
        iso_str = '' if len(iso_code) < 1 else str(iso_code[0])
        region_str = '' if len(region) < 1 else region[0]
        avgtmp_str = '' if len(avgtmp) < 1 else '' if avgtmp[0] == None else str(avgtmp[0])
        currency_str = '' if len(currency) < 1 else currency[0]
        cities_list = [] if len(cities) < 1 else cities[0]
        
        country_item = {
            "id": f"{continent_id}.{country_id:02}",
            "name": name,
            "abbreviation": abbrev_str,
            "capital": capital_str,
            "dot_url": dot_url_str,
            "iso": iso_str,
            "region": region_str,
            "avgtmp": f"{avgtmp_str}",
            "currency": currency_str,
            "cities": cities_list
        }
        country_items.append(country_item)
        country_id += 1
    
    #print(country_items)
    continent_item = {
        "id": f"{continent_id}",
        "name": continent,
        "countries": country_items
    }
    continents.append(continent_item)
    continent_id += 1

json_continents = {"continents": continents}
with open('countries_data.json', 'w') as f:
    json.dump(json_continents, f, indent=4)
