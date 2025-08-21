from flask import Flask, render_template, request
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Fix GUI backend issues
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from flask_cors import CORS
import io
import base64

app = Flask(__name__)
CORS(app)

# Load and preprocess the dataset
df = pd.read_csv(r'df.csv')
df['Offence_From_Date'] = pd.to_datetime(df['Offence_From_Date'])
df['Year'] = df['Offence_From_Date'].dt.year
df['Month'] = df['Offence_From_Date'].dt.month
df['Day'] = df['Offence_From_Date'].dt.day
df['Hour'] = df['Offence_From_Date'].dt.hour

@app.route('/')
def index():
    return render_template('input.html')

@app.route('/predict', methods=['POST'])
def predict():
    month = int(request.form['month'])
    day = int(request.form['day'])
    category = request.form['category']

    # Filter by crime category
    category_df = df[df['CrimeGroup_Name'] == category]

    # Prepare monthly, daily, hourly distributions
    dftest1_month = category_df['Month'].value_counts().rename_axis('Month').reset_index(name='count').set_index('Month')
    dftest1_day = category_df['Day'].value_counts().rename_axis('Day').reset_index(name='count').set_index('Day')
    dftest1_hour = category_df['Hour'].value_counts().rename_axis('Hour').reset_index(name='count').set_index('Hour')

    # Prepare year-wise training data
    dftest1_year_train = pd.DataFrame(category_df['Year'].value_counts()).iloc[1:9, :].reset_index()
    dftest1_year_train.columns = ['Year', 'count']

    # Train the model
    model = LinearRegression()
    model.fit(dftest1_year_train[['Year']], dftest1_year_train['count'])
    predicted_value = model.predict([[2024]])[0]

    # Generate prediction for 24 hours
    value = np.zeros(24)
    for x in range(24):
        month_factor = dftest1_month.loc[month, 'count'] / dftest1_month['count'].sum() if month in dftest1_month.index else 0
        day_factor = dftest1_day.loc[day, 'count'] / dftest1_day['count'].sum() if day in dftest1_day.index else 0
        hour_factor = dftest1_hour.loc[x, 'count'] / dftest1_hour['count'].sum() if x in dftest1_hour.index else 0

        value[x] = predicted_value * month_factor * day_factor * hour_factor

    # Plot the prediction
    plt.bar(range(24), value)
    plt.xlabel('Hour')
    plt.ylabel('Predicted Crime Probability')
    plt.title('Crime Distribution by Hour')

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode()
    plt.close()

    html_content = f"""
    <div>
        <h1>Prediction Result</h1>
        <img src="data:image/png;base64,{plot_data}" alt="Crime Distribution">
    </div>
    """ 
    return html_content

if __name__ == '__main__':
    app.run(debug=True)
