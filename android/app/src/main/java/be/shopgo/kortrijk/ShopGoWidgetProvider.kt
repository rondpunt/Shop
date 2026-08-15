package be.shopgo.kortrijk

import android.app.PendingIntent
import android.app.appwidget.AppWidgetManager
import android.app.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ShopGoWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val endsAtStr = prefs.getString("_cap_active_ends_at", null)
            val address = prefs.getString("_cap_active_address", "Geen actieve sessie") ?: "Geen actieve sessie"

            val views = RemoteViews(context.packageName, R.layout.shopgo_widget_layout)

            if (endsAtStr != null) {
                try {
                    // Try parsing ISO strings like "2026-07-16T15:30:00.000Z"
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }
                    val endsAtDate = sdf.parse(endsAtStr)
                    val endsAtMillis = endsAtDate?.time ?: 0L
                    val now = System.currentTimeMillis()
                    val remainingMillis = endsAtMillis - now

                    if (remainingMillis > 0) {
                        val minutes = (remainingMillis / 1000 / 60).toInt()
                        val seconds = ((remainingMillis / 1000) % 60).toInt()
                        views.setTextViewText(R.id.widget_title, "Actieve Parkeersessie")
                        views.setTextViewText(R.id.widget_timer, String.format("%02d:%02d", minutes, seconds))
                        views.setTextViewText(R.id.widget_address, address)
                    } else {
                        views.setTextViewText(R.id.widget_title, "Parkeertijd verlopen")
                        views.setTextViewText(R.id.widget_timer, "00:00")
                        views.setTextViewText(R.id.widget_address, "Opgelet voor boete!")
                    }
                } catch (e: Exception) {
                    views.setTextViewText(R.id.widget_title, "Fout bij laden")
                    views.setTextViewText(R.id.widget_timer, "--:--")
                }
            } else {
                views.setTextViewText(R.id.widget_title, "Shop & Go")
                views.setTextViewText(R.id.widget_timer, "START")
                views.setTextViewText(R.id.widget_address, "Geen actieve sessie")
            }

            // Click intent to open the main app
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
