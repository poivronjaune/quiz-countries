# Countries Memory Practice

This app will called called ATALS and is a web site designed to help users learn and remember country names around the world. It displays an SVG map of the world taht can be used to visualize where countries are located on continents.  

# Features  
Feature 1 : Main webpage with an input field in the header will permit the user to enter his/her name and age.  

Feature 2 : World map accessible by a menu item in the header will open the continents page where a list on the left of the page will displayed all the continents. When the user clicks one of the continents, it will become highlighted and a list of the courntries in that continent will be displayed on the right side of the page.  Other menus will be added later.  

Feature 3 : Quiz accessible by a menu item that offers a quiz to practice and evaluate general geography information on the world map.  

Feature 4 : Multi lingual, the quiz will ask for a preferred langage setting and all maps names, continents and capitals will be displayed in teh selected langage

## Feature 1 : Main webpage Details
This feature defines the general look and feel of the website and it's layout.  

1.1) Use a header that has 2 horizontal sections.  
1.2) The header horizontal section 1 (Top section) will contain the log and name of the app on the left, the inout fields for your profile on the right including the save button.  
1.3) The header horizontal section 2 (below the section 1) will contain the main menu items  
1.4) The footer will only have one horizontal section located at the bottom of the page. If the page content does not fill the viewing area, the footer must pushed down to the bottom, if the content os larger than the vieweing area, the footer goes after the content.  
1.5) The footer contains the name of the app on the left, a designed by mention for poivronjaune, on the right display a link called UN-M49 Data and a linkt to the officiel data source: https://unstats.un.org/unsd/methodology/m49/overview/  
1.6) No specific home page is required  
1.7) Use the footer area at the bottom as described in point #4 and #5

## Feature 2 : World Map Details
This feature consists of the main mas functionnality to select and view country infrmation.  

2.1) The main default page will be the continents page, use the solgan the world, in seven parts. Display a title calle Continents and the number of 2.countries.  
2.8) The next part will be the interactive map area.  
2.9) The map area, will have an icon to toggle between in page normal view and full page view.  
2.10) The map area will display a list of continents on the left and a list of countries for the selected continent on the right (the default continent 2.selected should be Africa and the default selected country should be the first one in the list of countries for the selected continent). This means there is 2.ALWAYS a continent selected and a country.    
2.11) The right list of countries does not have a search bar.  
2.12) The world map will be displayed in light green with white lines seperating the countries  
2.13) The selected continent will be highlighted on the map in a darker shade of green.  
2.14) The selected country will be highlighted on the map in a color different that the greens used for continent and country, but must have a high contrast.  
2.15) The user can select a continent from the list and the map will be automatically adjusted to display the highlight  
2.16) The user can select a country and the map will be automatically highlighted  
2.17) The user can click on a country in the maps, and the continent and country selected in the left and right lists will automaticallt be adjusted  
2.18) Above the Map area display an input box to search for a country. When typing letters automatically show countries that start with search string. Do not 2.update the map area lists until a selection is confirmed.  
2.19) Under the map area, I want a section that will display information on the country selected. Show the name, the isoAlpha3 code, and a small flag of the 2.country.
2.20) In the section under the map where the flag is displayed, add the name of the capital of the selected country. Place the name on the right of this section.  

## Feature 3 : Quiz Details  
The quiz feature offers random questions on world map geography where the user can answer questions by typing is answer or by clicking on the world map.  
3.1) Displays a dropdown box to choose how many questions will asked.  
3.2) A random generator to pick a country
3.4) The user will point on the map to give his answer, the user must be able to zoom in and out with the mouse scroll or a range selector like on the continent page.  
3.5) The user must be able to move the map around using the mouse when clicking the left button even when zommed in.
3.6) If the answer is correct, we will add his scrore. The score needs to be displayed somewhere at the top of this page.  
3.7) If the answer is wrong the country will be displayed in red and the correct country will be displayed in Dark Green
3.8) the quiz will end when the number of questions chosen by the user is reached and his score will be displayed until he changes web page.  
3.9) The list of questions must be displayed as the user answers. All questions must not be dislayed at the begining f the quiz, but added as the user answers.  

## Feature 4 : Multi lingual support
This feature only adds multiple langages to the web app. It does not chaneg any of the other features.
4.1) Add a langage selector in the header o the menu line. The langage selector should a dropdown with english and french selections.  
4.2) The countries.json file must be updated with a langage key that will contain all translatable strings for continents, countries and capitals
4.3) the web interface labels should also be displayed in the selected langage including all displayed text, slogan, etc...
