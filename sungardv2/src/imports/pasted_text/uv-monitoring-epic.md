Epic 1 - UV Monitoring
Purpose: To provide users with real-time UV information and alerts so they can better understand current sun exposure risk.
User Stories:
US1.1 Real-time UV alerts
 As a young adult spending time outdoors, I want to receive real-time UV alerts so that I can protect my skin from harmful radiation.
Description: Must Have. The system retrieves real-time UV index data from the OpenWeather API based on the user's location and displays it on the dashboard. When UV levels reach potentially dangerous thresholds, the system generates a clear alert message that explains the risk level and encourages protective actions.
Acceptance Criteria
System retrieves UV index using OpenWeather API
UV index is updated automatically
Alert message appears when UV ≥ 6
Alert message clearly explains the UV risk
UV index value is displayed on the dashboard
Benefit: This feature helps users understand UV risk instantly and encourages timely sun protection actions, especially during periods of high UV exposure.
US1.2 UV forecast for the day
 As a user planning outdoor activities, I want to see the UV forecast throughout the day so that I can plan safer times for outdoor activities.
Description: Must Have. The system retrieves hourly UV forecast data from the OpenWeather API and displays it on the dashboard. The forecast is presented in a visual format such as a timeline or graph so that users can quickly identify high-risk UV periods throughout the day.
Acceptance Criteria
System retrieves hourly UV forecast
Forecast displays at least 12 hours of data
Data displayed in a graph or timeline
Forecast updates automatically
Forecast loads correctly on dashboard
Benefit: This feature helps users plan outdoor activities more safely by identifying periods of high UV exposure and encouraging protective behaviour during peak UV hours.
US1.3 UV risk colour scale
As a user checking UV levels, I want the UV risk displayed using a colour scale so that I can quickly understand the level of danger.
Description: Must Have. The system displays the UV index together with a colour-coded risk scale that represents different UV danger levels (e.g., Low, Moderate, High, Very High, Extreme). This visual indicator allows users to quickly interpret UV conditions without needing to understand the numeric UV index values.
Acceptance Criteria
UV risk levels are displayed using colours
Colour legend clearly explains categories
Colour updates dynamically when UV changes
Colour scale appears beside UV value
Benefit: This feature simplifies UV information by translating numerical UV data into an intuitive visual signal, allowing users to instantly recognise dangerous UV conditions and take protective action.
Epic 2 - Skin Cancer Awareness
Purpose: To educate users about the risks of UV exposure using reliable open datasets and visual information.
User Stories:
US2.1 Visualise skin cancer incidence trends
As a user concerned about skin health, I want to see visualised statistics about skin cancer rates so that I can understand the seriousness of the issue.
Description: Should Have. The system visualises historical skin cancer incidence data using approved open datasets. The data is displayed through simple charts that illustrate how skin cancer rates have changed over time in Australia. This visual representation helps users understand the long-term consequences of UV exposure.
Acceptance Criteria
System loads approved cancer dataset
Chart displays cancer incidence over time
Chart includes title and axis labels
Data matches dataset values
Chart loads correctly
Benefit: This feature raises awareness by transforming complex health statistics into easy-to-understand visual insights, helping users better recognise the long-term risks associated with excessive UV exposure.
US2.2 Visualise sun protection behaviour trends
As a user interested in sun safety habits, I want to view data on sun protection behaviours so that I can compare my behaviour with broader trends.
Description: Should Have. The system visualises sun protection behaviour data from approved open datasets. The information is presented through charts that show common protective behaviours such as sunscreen use, wearing hats, and seeking shade. This helps users understand typical sun protection practices and encourages safer behaviour.
Acceptance Criteria
Behaviour dataset successfully loaded
Chart shows behaviour categories
Data labels are clear
Chart renders without errors
Benefit: This feature helps users compare their own habits with common sun protection behaviours in Australia, promoting awareness and encouraging healthier sun safety practices.
US2.3 Myth-busting educational content
As a user exposed to social media tanning trends, I want to see factual information that debunks common myths about tanning so that I can make better health decisions.
Description: Should Have. The system provides an educational section that highlights common misconceptions about UV exposure and sun safety, such as “it’s not dangerous if it’s cloudy” or “only fair skin burns.” Each myth is paired with a clear explanation based on reliable health information to help users better understand the real risks of UV exposure.
Acceptance Criteria
System displays at least 3 myths
Each myth includes explanation
Content is clearly formatted
Educational section accessible
Benefit: This feature helps correct common misunderstandings about sun safety and encourages users to adopt healthier sun protection habits.
Epic 3 — Personalised Sun Protection Advice
Purpose: To provide customized sun protection recommendations based on user characteristics.
User Stories:
US3.1 Skin type protection advice
As a user with a specific skin type, I want to receive sun protection advice tailored to my skin type so that I can better prevent sunburn and skin damage.
Description: Must Have. The system allows users to select their skin type and receive sun protection advice tailored to their level of UV sensitivity. The advice may include recommended SPF levels, protective clothing, and guidance on limiting sun exposure during peak UV hours.
Acceptance Criteria
User selects skin type
System displays appropriate advice
Advice updates when skin type changes
Advice text is clear
Benefit: This feature provides personalised sun safety guidance that reflects individual skin sensitivity to UV radiation, helping users better protect themselves and reduce the risk of sunburn and long-term skin damage.
US3.2 Personalised sunscreen recommendation
As a user selecting sunscreen products, I want recommendations for appropriate SPF levels so that I can choose suitable protection.
Description: Must Have. The system analyses the current UV index and provides sunscreen recommendations appropriate for the level of UV exposure. The recommendation includes suggested SPF levels and protective advice so that users can take the correct precautions before going outdoors.
Acceptance Criteria
System reads current UV index
System recommends SPF level
Recommendation updates when UV changes
Advice displayed clearly
Benefit: This feature translates UV index information into practical protection guidance, helping users quickly understand what level of sunscreen protection they need under current UV conditions.
US3.3 UV exposure risk estimation
As a user planning outdoor activities, I want to estimate my UV exposure risk so that I can take preventive action.
Description: Must Have. The system estimates the user’s UV exposure risk based on the current UV index and environmental conditions. The calculated risk level is displayed using simple categories (e.g., Low, Moderate, High) so that users can quickly understand their level of exposure and take appropriate protective actions.
Acceptance Criteria
System calculates exposure risk
Risk displayed as low/moderate/high
Risk updates when UV changes
Risk indicator visible
Benefit: This feature helps users interpret UV information more easily by converting UV index values into a clear risk level, enabling faster and more informed sun protection decisions.
Epic 4 — Sunscreen Reminder System
Purpose: To help users maintain consistent sun protection by reminding them to reapply sunscreen.
User Stories:
US4.1 Reapply sunscreen reminders
As a user spending extended time outdoors, I want reminders to reapply sunscreen so that I maintain effective protection.
Description: Must Have. The system provides periodic reminders prompting users to reapply sunscreen while they are outdoors. The reminder is based on recommended reapplication intervals (e.g., every two hours) to ensure that sunscreen protection remains effective during extended sun exposure.
Acceptance Criteria
Reminder triggered every 2 hours
Notification visible to user
Reminder can be dismissed
Reminder repeats if needed
Benefit: This feature helps users maintain effective sun protection by reminding them to reapply sunscreen at appropriate intervals, reducing the risk of sunburn and prolonged UV exposure.
US4.2 Notification based on UV intensity
As a user outdoors during high UV periods, I want alerts triggered by high UV intensity so that I can take immediate protective action.
Description: Must Have. The system monitors the current UV index and sends notifications when the UV level reaches potentially harmful levels. These alerts inform users when additional sun protection is required and encourage actions such as applying sunscreen, wearing protective clothing, or seeking shade.
Acceptance Criteria
Notification triggered when UV ≥ 6
Alert message clearly explains risk
Notification appears promptly
Benefit: This feature provides timely warnings when UV exposure becomes dangerous, helping users react quickly and reduce the risk of sunburn or prolonged UV damage.
US4.3 Reminder history tracking
As a user monitoring my sun protection habits, I want to view my reminder history so that I can track my sun safety behaviour.
Description: Should Have. The system records the timestamps of sunscreen reminders and allows users to view their reminder history. This feature provides users with a simple overview of their past reminders and helps them track how consistently they reapply sunscreen during outdoor activities.
Acceptance Criteria
System records reminder timestamps
User can view reminder history
History displayed clearly
Benefit: This feature helps users reflect on their sun protection habits and encourages more consistent sunscreen reapplication by providing a visible record of reminder activity.
